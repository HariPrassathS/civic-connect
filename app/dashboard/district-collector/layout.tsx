import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import {
  LayoutDashboard,
  FileText,
  Map,
  AlertTriangle,
  BarChart3,
  TrendingUp,
} from "lucide-react";

const navItems = [
  {
    title: "District Overview",
    href: "/dashboard/district-collector",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "All Complaints",
    href: "/dashboard/district-collector/complaints",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Escalated Issues",
    href: "/dashboard/district-collector/alerts",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    title: "District Heatmap",
    href: "/dashboard/district-collector/heatmap",
    icon: <Map className="h-4 w-4" />,
  },
  {
    title: "Predictive Analytics",
    href: "/dashboard/district-collector/predictions",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/dashboard/district-collector/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function DistrictCollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="District Collector" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
