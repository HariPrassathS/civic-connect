import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Building2, FolderTree, Timer } from "lucide-react";

export default async function AdminOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  // Fetch counts
  const [usersRes, deptsRes, catsRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      title: "Total Users",
      count: usersRes.count ?? 0,
      href: "/admin/users",
      icon: <Users className="h-5 w-5 text-blue-500" />,
    },
    {
      title: "Departments",
      count: deptsRes.count ?? 0,
      href: "/admin/departments",
      icon: <Building2 className="h-5 w-5 text-green-500" />,
    },
    {
      title: "Categories",
      count: catsRes.count ?? 0,
      href: "/admin/categories",
      icon: <FolderTree className="h-5 w-5 text-orange-500" />,
    },
    {
      title: "Escalation Config",
      count: "8 Levels",
      href: "/admin/escalation",
      icon: <Timer className="h-5 w-5 text-red-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Console</h2>
        <p className="text-muted-foreground">
          Manage users, departments, categories, and escalation rules.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                {s.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.count}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
