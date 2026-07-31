import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import {
  LayoutDashboard,
  FileText,
  Map,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

const navItems = [
  {
    title: "City Overview",
    href: "/dashboard/commissioner",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "All Complaints",
    href: "/dashboard/commissioner/complaints",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Critical Alerts",
    href: "/dashboard/commissioner/alerts",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    title: "City Heatmap",
    href: "/dashboard/commissioner/heatmap",
    icon: <Map className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/dashboard/commissioner/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function CommissionerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="GCC Commissioner" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
