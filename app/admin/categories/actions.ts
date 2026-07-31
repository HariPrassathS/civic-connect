"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCategory(name: string, parentId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ name, parent_id: parentId });
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
  return { success: true };
}
