import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderTree,
  Timer,
} from "lucide-react";

const navItems = [
  {
    title: "Overview",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Departments",
    href: "/admin/departments",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: <FolderTree className="h-4 w-4" />,
  },
  {
    title: "Escalation",
    href: "/admin/escalation",
    icon: <Timer className="h-4 w-4" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="Admin" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
