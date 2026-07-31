import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DepartmentManager } from "./department-manager";

export default async function AdminDepartmentsPage() {
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

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, city, created_at")
    .order("name");

  const { data: wards } = await supabase
    .from("wards")
    .select("id, name, area_officer_id, created_at")
    .order("name");

  const { data: officers } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["area_officer", "department_head"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Departments & Wards
        </h2>
        <p className="text-muted-foreground">
          Create and manage departments, wards, and assign officers.
        </p>
      </div>

      <DepartmentManager
        departments={departments ?? []}
        wards={wards ?? []}
        officers={officers ?? []}
      />
    </div>
  );
}
