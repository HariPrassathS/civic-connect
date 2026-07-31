"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleUpvote(complaintId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to upvote." };
  }

  // Check if upvote exists
  const { data: existing } = await supabase
    .from("complaint_upvotes")
    .select("id")
    .eq("complaint_id", complaintId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Remove upvote
    const { error } = await supabase
      .from("complaint_upvotes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Error removing upvote:", error);
      return { error: "Failed to remove upvote." };
    }
  } else {
    // Add upvote
    const { error } = await supabase
      .from("complaint_upvotes")
      .insert({
        complaint_id: complaintId,
        user_id: user.id,
      });

    if (error) {
      console.error("Error adding upvote:", error);
      return { error: "Failed to upvote." };
    }
  }

  revalidatePath("/dashboard/citizen/community");
  return { success: true };
}
