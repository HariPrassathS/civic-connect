import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ESCALATION_LEVELS, calculateSLADeadline } from "./rules";
import type { UserRole } from "@/types/database";

/**
 * Reassigns a complaint to the appropriate person at the NEXT level.
 * Uses the service_role key because this is called via a background cron.
 */
export async function autoEscalateComplaint(
  supabaseService: SupabaseClient<any, any, any>,
  complaint: any
): Promise<boolean> {
  const currentLevel = complaint.escalation_level;
  const currentAssignee = complaint.assigned_to;
  
  if (currentLevel >= 8) return false; // Max level reached

  const nextLevel = currentLevel + 1;
  const nextConfig = ESCALATION_LEVELS.find((l) => l.level === nextLevel);
  if (!nextConfig) return false;

  let newAssignee: string | null = null;
  let nextRole = nextConfig.role;

  // ── Reassignment Logic ──────────────────────────────
  // We need to look up the current assignee's context (ward/department)
  let context = { ward_id: null, department_id: null };
  if (currentAssignee) {
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("ward_id, department_id")
      .eq("id", currentAssignee)
      .single();
    if (profile) context = profile;
  } else if (complaint.category_id) {
     // If no one was assigned, try to fallback to a field worker
     // (We assume for this MVP that the complaint already had a worker, but just in case)
  }

  // Find the appropriate user for the next role based on the context
  let query = supabaseService.from("profiles").select("id").eq("role", nextRole);
  
  if (nextRole === "area_officer" && context.ward_id) {
    query = query.eq("ward_id", context.ward_id);
  } else if (nextRole === "department_head" && context.department_id) {
    query = query.eq("department_id", context.department_id);
  }
  
  // For commissioner and above, it's city/state wide, so we just get anyone with that role
  const { data: candidates } = await query;
  
  if (candidates && candidates.length > 0) {
    // Pick the first available one for MVP (in production we'd route by load or district)
    newAssignee = candidates[0].id;
  } else {
    // Fallback: If no area officer is set for the ward, just pick ANY area officer
    // so the escalation doesn't get stuck.
    const { data: fallback } = await supabaseService
      .from("profiles")
      .select("id")
      .eq("role", nextRole)
      .limit(1);
    if (fallback && fallback.length > 0) {
      newAssignee = fallback[0].id;
    }
  }

  // Calculate new SLA deadline based on the next level's window
  const newSlaDeadline = calculateSLADeadline(nextLevel, new Date());

  // ── Database Updates ──────────────────────────────
  
  // 1. Mark as escalated in audit log BEFORE changing assignee
  await supabaseService.from("complaint_updates").insert({
    complaint_id: complaint.id,
    note: `Auto-escalated to Level ${nextLevel} (${nextConfig.label}) due to SLA breach.`,
    status_from: complaint.status,
    status_to: "escalated",
  });

  // 2. Update complaint
  await supabaseService
    .from("complaints")
    .update({
      escalation_level: nextLevel,
      assigned_to: newAssignee || currentAssignee, // Keep old if no one found
      sla_deadline: newSlaDeadline ? newSlaDeadline.toISOString() : null,
      status: "assigned", // Reset status back to assigned for the new person
    })
    .eq("id", complaint.id);

  // 3. Log in escalation_logs
  await supabaseService.from("escalation_logs").insert({
    complaint_id: complaint.id,
    from_level: currentLevel,
    to_level: nextLevel,
    reason: "SLA Deadline Missed",
  });

  // 4. Send Notifications
  if (newAssignee) {
    await supabaseService.from("notifications").insert({
      user_id: newAssignee,
      title: "Complaint Escalated to You",
      body: `A complaint (L${nextLevel}) has breached SLA and escalated to your queue.`,
      channel: "in_app",
    });
  }
  
  // Notify citizen that it was escalated to higher authority
  if (complaint.citizen_id) {
    await supabaseService.from("notifications").insert({
      user_id: complaint.citizen_id,
      title: "Issue Escalated",
      body: `Your issue has been escalated to Level ${nextLevel} (${nextConfig.label}) for faster resolution.`,
      channel: "in_app",
    });
  }

  return true;
}
