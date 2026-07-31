import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import {
  LayoutDashboard,
  FileText,
  Map,
  AlertTriangle,
  BarChart3,
  Star,
} from "lucide-react";

const navItems = [
  {
    title: "CM Dashboard",
    href: "/dashboard/chief-minister",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "All Complaints",
    href: "/dashboard/chief-minister/complaints",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Critical Issues",
    href: "/dashboard/chief-minister/alerts",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    title: "State Heatmap",
    href: "/dashboard/chief-minister/heatmap",
    icon: <Map className="h-4 w-4" />,
  },
  {
    title: "Reports & Insights",
    href: "/dashboard/chief-minister/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function ChiefMinisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="Chief Minister (Tamil Nadu)" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
