"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function verifyResolution(complaintId: string, approved: boolean, note: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: complaint } = await supabase
    .from("complaints")
    .select("status")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Complaint not found" };

  const newStatus = approved ? "resolved" : "assigned";

  // Update status
  const { error: updateError } = await supabase
    .from("complaints")
    .update({ status: newStatus })
    .eq("id", complaintId);

  if (updateError) return { error: "Failed to update status" };

  // Log user update note
  await supabase.from("complaint_updates").insert({
    complaint_id: complaintId,
    actor_id: user.id,
    note: approved ? `Resolution verified and approved. Note: ${note}` : `Resolution rejected. Sent back to field worker. Note: ${note}`,
    status_from: complaint.status,
    status_to: newStatus,
  });

  revalidatePath(`/dashboard/area-officer/complaints/${complaintId}`);
  return { success: true };
}
