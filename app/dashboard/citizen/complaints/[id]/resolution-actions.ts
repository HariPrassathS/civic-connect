"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { dispatchNotification } from "@/lib/notifications/dispatcher";

export async function acceptResolution(
  complaintId: string,
  rating: number,
  comment: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 1. Fetch complaint
  const { data: complaint } = await supabase
    .from("complaints")
    .select("status, citizen_id, assigned_to")
    .eq("id", complaintId)
    .single();

  if (!complaint || complaint.citizen_id !== user.id) {
    return { error: "Complaint not found or unauthorized" };
  }
  if (complaint.status !== "resolution_submitted") {
    return { error: "Complaint is not awaiting resolution verification" };
  }

  // 2. Insert Feedback
  const { error: feedbackError } = await supabase.from("feedback").insert({
    complaint_id: complaintId,
    rating,
    comment,
  });

  if (feedbackError) return { error: "Failed to submit feedback" };

  // 3. Update status to closed
  await supabase
    .from("complaints")
    .update({ status: "closed" })
    .eq("id", complaintId);

  // 4. Log update
  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    actor_id: user.id,
    note: `Citizen accepted the resolution. Rating: ${rating}/5`,
    status_from: "resolution_submitted",
    status_to: "closed",
  });

  // 5. Notify worker
  if (complaint.assigned_to) {
    await dispatchNotification({
      userId: complaint.assigned_to,
      title: "Resolution Accepted",
      body: `The citizen accepted your resolution for complaint ${complaintId.slice(0, 5)}.`,
      channels: ["in_app"],
    });
  }

  revalidatePath(`/dashboard/citizen/complaints/${complaintId}`);
  return { success: true };
}

export async function rejectResolution(
  complaintId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: complaint } = await supabase
    .from("complaints")
    .select("status, citizen_id, assigned_to")
    .eq("id", complaintId)
    .single();

  if (!complaint || complaint.citizen_id !== user.id) {
    return { error: "Complaint not found or unauthorized" };
  }

  // Set back to in_progress
  await supabase
    .from("complaints")
    .update({ status: "in_progress" })
    .eq("id", complaintId);

  // Log rejection
  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    actor_id: user.id,
    note: `Citizen rejected the resolution: ${reason}`,
    status_from: "resolution_submitted",
    status_to: "in_progress",
  });

  // Notify worker
  if (complaint.assigned_to) {
    await dispatchNotification({
      userId: complaint.assigned_to,
      title: "Resolution Rejected",
      body: `The citizen rejected the resolution for ${complaintId.slice(0, 5)}. Reason: ${reason}`,
      channels: ["in_app"],
    });
  }

  revalidatePath(`/dashboard/citizen/complaints/${complaintId}`);
  return { success: true };
}
