import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
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

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, department_id, ward_id, created_at")
    .order("created_at", { ascending: false });

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name");

  const { data: wards } = await supabase.from("wards").select("id, name");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          List, search, edit roles, and manage user assignments.
        </p>
      </div>

      <UserTable
        users={users ?? []}
        departments={departments ?? []}
        wards={wards ?? []}
      />
    </div>
  );
}
