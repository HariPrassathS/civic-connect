import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";

const navItems = [
  {
    title: "Overview",
    href: "/dashboard/area-officer",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Complaints",
    href: "/dashboard/area-officer/complaints",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Team Performance",
    href: "/dashboard/area-officer/team",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/dashboard/area-officer/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function AreaOfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="Area Officer" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
