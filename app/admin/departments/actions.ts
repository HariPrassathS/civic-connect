"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDepartment(name: string, city: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .insert({ name, city });
  if (error) return { error: error.message };
  revalidatePath("/admin/departments");
  return { success: true };
}

export async function updateDepartment(id: string, name: string, city: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name, city })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/departments");
  return { success: true };
}

export async function createWard(name: string, areaOfficerId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("wards")
    .insert({ name, area_officer_id: areaOfficerId });
  if (error) return { error: error.message };
  revalidatePath("/admin/departments");
  return { success: true };
}

export async function updateWard(
  id: string,
  name: string,
  areaOfficerId: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("wards")
    .update({ name, area_officer_id: areaOfficerId })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/departments");
  return { success: true };
}
