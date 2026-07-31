"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

import { verifyResolution } from "@/lib/ai/verify-resolution";

export async function updateTaskStatus(
  complaintId: string,
  newStatus: string,
  note: string,
  fundsAllocated?: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get current status
  const { data: complaint } = await supabase
    .from("complaints")
    .select("status, assigned_to, ai_summary")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Complaint not found" };
  if (complaint.assigned_to !== user.id) return { error: "Not assigned to you" };

  // Log allocated government funds if specified
  if (fundsAllocated !== undefined && fundsAllocated > 0) {
    const formattedFunds = `₹${fundsAllocated.toLocaleString("en-IN")}`;
    const fundNote = `💰 Government Fund Allocated for Project/Road Installation: ${formattedFunds}`;
    await supabase.from("complaint_updates").insert({
      complaint_id: complaintId,
      actor_id: user.id,
      note: fundNote,
      status_from: complaint.status,
      status_to: complaint.status,
    });

    // Also inject into ai_summary for permanent dashboard viewing across tiers
    const newSummary = `${complaint.ai_summary || ""} [FUND: ${formattedFunds}]`.trim();
    await supabase.from("complaints").update({ ai_summary: newSummary }).eq("id", complaintId);
  }

  // --- NEW AI VERIFICATION LOGIC ---
  if (newStatus === "resolution_submitted") {
    const aiResult = await verifyResolution(complaintId);
    
    if (!aiResult.isValid) {
      // AI Rejected it. Log a note but don't change the status
      await supabase.from("complaint_updates").insert({
        complaint_id: complaintId,
        actor_id: null, // System action
        note: `AI Verification Failed: ${aiResult.reasoning}`,
        status_from: complaint.status,
        status_to: complaint.status, // stays the same
      });
      revalidatePath(`/dashboard/field-worker/complaints/${complaintId}`);
      return { error: `AI Verification Failed: ${aiResult.reasoning}` };
    } else {
      // AI Accepted it. Add a success note.
      await supabase.from("complaint_updates").insert({
        complaint_id: complaintId,
        actor_id: null, // System action
        note: `AI Verification Passed (${(aiResult.confidence * 100).toFixed(0)}% confidence): ${aiResult.reasoning}`,
        status_from: complaint.status,
        status_to: newStatus,
      });
    }
  }

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
    note,
    status_from: complaint.status,
    status_to: newStatus,
  });

  revalidatePath(`/dashboard/field-worker/complaints/${complaintId}`);
  return { success: true };
}

export async function logWork(
  complaintId: string,
  hours: number,
  note: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("work_logs").insert({
    complaint_id: complaintId,
    worker_id: user.id,
    hours,
    note,
  });

  if (error) return { error: "Failed to log work" };

  revalidatePath(`/dashboard/field-worker/complaints/${complaintId}`);
  return { success: true };
}

export async function sendMessage(complaintId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("messages").insert({
    complaint_id: complaintId,
    sender_id: user.id,
    content,
  });

  if (error) return { error: "Failed to send message" };

  revalidatePath(`/dashboard/field-worker/complaints/${complaintId}`);
  // Also revalidate citizen view
  revalidatePath(`/dashboard/citizen/complaints/${complaintId}`);
  return { success: true };
}

export async function uploadTaskMedia(complaintId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify this worker is assigned to the complaint
  const { data: complaint } = await supabase
    .from("complaints")
    .select("assigned_to")
    .eq("id", complaintId)
    .single();

  if (!complaint || complaint.assigned_to !== user.id) {
    return { error: "You are not assigned to this complaint" };
  }

  const file = formData.get("media") as File;
  if (!file) return { error: "No file provided" };

  // Use service role client to bypass storage & RLS restrictions for field workers
  const serviceClient = createServiceRoleClient();

  const ext = file.name.split(".").pop() || "bin";
  const filePath = `${complaintId}/resolution-${Date.now()}.${ext}`;

  const { error: uploadError } = await serviceClient.storage
    .from("complaint-media")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: "Failed to upload file: " + uploadError.message };
  }

  const { data: urlData } = serviceClient.storage
    .from("complaint-media")
    .getPublicUrl(filePath);

  const mediaType = file.type?.startsWith("image/")
    ? "image"
    : file.type?.startsWith("video/")
      ? "video"
      : "audio";

  const { error: insertErr } = await serviceClient.from("complaint_media").insert({
    complaint_id: complaintId,
    url: urlData.publicUrl,
    type: mediaType,
  });

  if (insertErr) {
    console.error("complaint_media insert error:", insertErr);
    return { error: "Failed to save media record" };
  }

  // Log as update
  await serviceClient.from("complaint_updates").insert({
    complaint_id: complaintId,
    actor_id: user.id,
    note: "Uploaded resolution photo",
    status_from: null,
    status_to: null,
  });

  revalidatePath(`/dashboard/field-worker/complaints/${complaintId}`);
  return { success: true };
}
