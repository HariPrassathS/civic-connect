import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { ClipboardList, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FieldWorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Optional: Add an extra check here to ensure the user is actually a field_worker
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "field_worker") {
    redirect("/dashboard/citizen");
  }

  const navItems = [
    {
      title: "My Tasks",
      href: "/dashboard/field-worker",
      icon: <ClipboardList className="h-5 w-5 md:h-4 md:w-4" />,
    },
    {
      title: "Map View",
      href: "/dashboard/field-worker/map", // We can leave this as a stub for now
      icon: <MapPin className="h-5 w-5 md:h-4 md:w-4" />,
    },
  ];

  return (
    <DashboardShell roleName="Field Worker" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
