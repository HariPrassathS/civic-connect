"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ESCALATION_LEVELS } from "./rules";
import { autoEscalateComplaint } from "./engine";

/**
 * Manually reassign a task to someone else.
 * Area Officers and above can do this.
 */
export async function reassignTask(
  complaintId: string,
  newAssigneeId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 1. Check if user is allowed to reassign (must be area_officer or above)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || ["citizen", "field_worker"].includes(profile.role)) {
    return { error: "Unauthorized to reassign tasks" };
  }

  // 2. Fetch complaint
  const { data: complaint } = await supabase
    .from("complaints")
    .select("status, assigned_to")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Complaint not found" };

  // 3. Update complaint
  const { error: updateError } = await supabase
    .from("complaints")
    .update({ 
      assigned_to: newAssigneeId,
      status: "assigned" // reset status so the new assignee can accept it
    })
    .eq("id", complaintId);

  if (updateError) return { error: "Failed to reassign" };

  // 4. Log update
  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    actor_id: user.id,
    note: `Manually reassigned task. Reason: ${reason}`,
    status_from: complaint.status,
    status_to: "assigned",
  });

  // 5. Send notification to new assignee
  await supabase.from("notifications").insert({
    user_id: newAssigneeId,
    title: "New Task Assigned",
    body: `A task was manually reassigned to you.`,
    channel: "in_app",
  });

  revalidatePath(`/dashboard`);
  return { success: true };
}

/**
 * Manually force an escalation immediately, skipping the timer.
 */
export async function manuallyEscalate(
  complaintId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || ["citizen", "field_worker"].includes(profile.role)) {
    return { error: "Unauthorized to escalate tasks manually" };
  }

  // Fetch the full complaint
  const { data: complaint } = await supabase
    .from("complaints")
    .select("*")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Complaint not found" };

  // Service role client needed to run the engine logic
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const { createClient: createServiceClient } = await import("@supabase/supabase-js");
  const supabaseService = createServiceClient(supabaseUrl, supabaseServiceKey);

  // Use the engine but append the manual reason to the audit log
  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    actor_id: user.id,
    note: `Manual escalation requested: ${reason}`,
    status_from: complaint.status,
    status_to: complaint.status,
  });

  const success = await autoEscalateComplaint(supabaseService, complaint);

  if (!success) {
    return { error: "Max escalation level reached or assignment failed" };
  }

  revalidatePath(`/dashboard`);
  return { success: true };
}
