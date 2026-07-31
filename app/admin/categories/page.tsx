import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "./category-manager";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id, created_at")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Category Management
        </h2>
        <p className="text-muted-foreground">
          Create, edit, and organize complaint categories and subcategories.
        </p>
      </div>

      <CategoryManager categories={categories ?? []} />
    </div>
  );
}
