"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendCitizenMessage(complaintId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("messages")
    .insert({
      complaint_id: complaintId,
      sender_id: user.id,
      content,
    });

  if (error) {
    console.error("Failed to send message:", error);
    return { error: "Failed to send message" };
  }

  revalidatePath(`/dashboard/citizen/complaints/${complaintId}`);
  return { success: true };
}
