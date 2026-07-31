"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { processNewComplaint } from "@/lib/ai/process-complaint";

export type SubmitIssueResult = {
  error?: string;
  complaintId?: string;
};

export async function submitIssue(formData: FormData): Promise<SubmitIssueResult> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to submit an issue." };
  }

  // Extract form data
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("category_id") as string;
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);
  const visibility = (formData.get("visibility") as string) || "public";

  if (!title?.trim()) {
    return { error: "Title is required." };
  }

  // Insert complaint
  const { data: complaint, error: insertError } = await supabase
    .from("complaints")
    .insert({
      citizen_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      category_id: categoryId || null,
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
      visibility,
      status: "received",
      escalation_level: 1,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Insert complaint error:", insertError);
    return { error: "Failed to submit issue. Please try again." };
  }

  // Upload media files — use service role for storage (bypasses storage RLS)
  const mediaFiles = formData.getAll("media") as File[];
  if (mediaFiles.length > 0) {
    const storageClient = createServiceRoleClient();
    for (const file of mediaFiles) {
      if (!file.size || file.size === 0) continue;

      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${complaint.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await storageClient.storage
        .from("complaint-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = storageClient.storage
        .from("complaint-media")
        .getPublicUrl(filePath);

      const mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "audio";

      await storageClient.from("complaint_media").insert({
        complaint_id: complaint.id,
        url: urlData.publicUrl,
        type: mediaType,
      });
    }
  }

  // Insert initial complaint_update as audit log
  await supabase.from("complaint_updates").insert({
    complaint_id: complaint.id,
    actor_id: user.id,
    note: "Issue submitted",
    status_from: null,
    status_to: "received",
  });

  // ── AI Processing Pipeline ───────────────────────────────
  // Runs duplicate detection, category refinement, priority scoring,
  // sentiment analysis, auto-assignment, and SLA deadline setting.
  // Wrapped in try-catch so AI failures NEVER block complaint creation.
  try {
    // Use service role client for AI processing — it needs to read profiles
    // across all users (RLS blocks citizen from viewing field worker profiles)
    const serviceClient = createServiceRoleClient();
    await processNewComplaint(serviceClient, complaint.id);
  } catch (err) {
    console.error("AI processing failed (non-blocking):", err);
    // Complaint remains in 'received' status — will be manually processed
  }

  redirect(`/dashboard/citizen/complaints/${complaint.id}`);
}

