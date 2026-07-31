"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSLASetting(key: string, value: number | null) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") return { error: "Unauthorized" };

  const jsonValue = value === null ? "null" : String(value);

  const { error } = await supabase
    .from("settings")
    .update({
      value: value === null ? null : value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", key);

  if (error) return { error: error.message };

  revalidatePath("/admin/escalation");
  return { success: true };
}
