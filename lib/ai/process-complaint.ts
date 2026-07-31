/**
 * Orchestrator: processes a newly created complaint through the AI pipeline.
 *
 * Flow:
 * 1. Set status → 'ai_processing'
 * 2. Check for duplicates (PostGIS + pg_trgm)
 * 3. If duplicate → mark as duplicate, notify citizen, stop
 * 4. If not duplicate:
 *    a. AI category refinement (with fallback)
 *    b. AI priority scoring (rule-based fallback)
 *    c. AI sentiment analysis (rule-based fallback)
 *    d. Auto-assign to nearest field worker
 *    e. Set SLA deadline (L1 = 24h)
 *    f. Set status → 'assigned'
 *
 * CRITICAL: Never blocks complaint creation. All AI failures fall back gracefully.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDuplicate } from "./duplicate-check";
import { refineCategory } from "./categorize";
import { scorePriority } from "./priority";
import { analyzeSentiment } from "./sentiment";
import { assignFieldWorker } from "../escalation/assign";
import { calculateSLADeadline } from "../escalation/rules";

export async function processNewComplaint(
  supabase: SupabaseClient,
  complaintId: string
): Promise<void> {
  // Fetch the full complaint
  const { data: complaint, error: fetchError } = await supabase
    .from("complaints")
    .select("*, category:categories(name)")
    .eq("id", complaintId)
    .single();

  if (fetchError || !complaint) {
    console.error("Failed to fetch complaint for processing:", fetchError);
    return;
  }

  // ── Step 1: Set status to ai_processing ──────────────────
  await supabase
    .from("complaints")
    .update({ status: "ai_processing" })
    .eq("id", complaintId);

  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    note: "AI processing started",
    status_from: "received",
    status_to: "ai_processing",
  });

  // ── Step 2: Duplicate detection ──────────────────────────
  const dupResult = await checkDuplicate(supabase, {
    id: complaintId,
    title: complaint.title,
    description: complaint.description,
    category_id: complaint.category_id,
    lat: complaint.lat,
    lng: complaint.lng,
  });

  if (dupResult.isDuplicate && dupResult.duplicateOf) {
    // Mark as duplicate
    await supabase
      .from("complaints")
      .update({
        duplicate_of: dupResult.duplicateOf,
        status: "closed",
        ai_summary: `Duplicate of complaint ${dupResult.duplicateOf} (similarity: ${(dupResult.similarity * 100).toFixed(0)}%)`,
      })
      .eq("id", complaintId);

    await supabase.from("complaint_updates").insert({
      complaint_id: complaintId,
      note: `Marked as duplicate (${(dupResult.similarity * 100).toFixed(0)}% similar). Original issue is being tracked.`,
      status_from: "ai_processing",
      status_to: "closed",
    });

    // Notify citizen
    if (complaint.citizen_id) {
      await supabase.from("notifications").insert({
        user_id: complaint.citizen_id,
        title: "Duplicate Issue Detected",
        body: `Your issue "${complaint.title}" appears to be a duplicate of an existing complaint that is already being tracked.`,
        channel: "in_app",
      });
    }

    return; // Stop processing — don't assign or set SLA
  }

  // ── Step 3: AI category refinement ───────────────────────
  const categoryResult = await refineCategory(supabase, {
    title: complaint.title,
    description: complaint.description,
    category_id: complaint.category_id,
  });

  // ── Step 4: AI priority scoring ──────────────────────────
  const priorityResult = await scorePriority(
    complaint.title,
    complaint.description,
    (complaint.category as any)?.name ?? categoryResult.categoryName
  );

  // ── Step 5: AI sentiment analysis ────────────────────────
  const sentimentResult = await analyzeSentiment(
    complaint.title,
    complaint.description
  );

  // ── Step 6: Auto-assign field worker ─────────────────────
  const assignment = await assignFieldWorker(supabase, {
    lat: complaint.lat,
    lng: complaint.lng,
    category_id: categoryResult.categoryId ?? complaint.category_id,
  });

  // ── Step 7: Calculate SLA deadline ───────────────────────
  const slaDeadline = calculateSLADeadline(1); // L1 = 24 hours

  // ── Step 8: Update complaint with all results ────────────
  const updatePayload: Record<string, any> = {
    status: assignment.assignedTo ? "assigned" : "received",
    priority: priorityResult.priority,
    sentiment: sentimentResult.sentiment,
    escalation_level: 1,
    ai_summary: [
      `Priority: ${priorityResult.priority} (${priorityResult.reasoning})`,
      `Sentiment: ${sentimentResult.sentiment} (${sentimentResult.reasoning})`,
      categoryResult.aiReasoning
        ? `Category: ${categoryResult.aiReasoning}`
        : null,
      assignment.reason,
    ]
      .filter(Boolean)
      .join(". "),
  };

  // Update category if AI refined it
  if (
    categoryResult.categoryId &&
    categoryResult.categoryId !== complaint.category_id &&
    categoryResult.confidence !== "low"
  ) {
    updatePayload.category_id = categoryResult.categoryId;
  }

  if (assignment.assignedTo) {
    updatePayload.assigned_to = assignment.assignedTo;
  }

  if (slaDeadline) {
    updatePayload.sla_deadline = slaDeadline.toISOString();
  }

  await supabase
    .from("complaints")
    .update(updatePayload)
    .eq("id", complaintId);

  // ── Step 9: Audit trail ──────────────────────────────────
  const notes: string[] = [];
  notes.push(`Priority set to ${priorityResult.priority}`);
  notes.push(`Sentiment: ${sentimentResult.sentiment}`);
  if (assignment.assignedTo) {
    notes.push(`Assigned to ${assignment.assignedName ?? "field worker"}`);
  }
  if (slaDeadline) {
    notes.push(`SLA deadline: ${slaDeadline.toISOString()}`);
  }

  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    note: `AI processing complete. ${notes.join(". ")}`,
    status_from: "ai_processing",
    status_to: assignment.assignedTo ? "assigned" : "received",
  });

  // Notify citizen of assignment
  if (assignment.assignedTo && complaint.citizen_id) {
    await supabase.from("notifications").insert({
      user_id: complaint.citizen_id,
      title: "Issue Assigned",
      body: `Your issue "${complaint.title}" has been assigned to ${assignment.assignedName ?? "a field worker"} and is being worked on.`,
      channel: "in_app",
    });
  }

  // Notify the assigned worker
  if (assignment.assignedTo) {
    await supabase.from("notifications").insert({
      user_id: assignment.assignedTo,
      title: "New Issue Assigned",
      body: `You have been assigned: "${complaint.title}" (Priority: ${priorityResult.priority})`,
      channel: "in_app",
    });
  }
}
