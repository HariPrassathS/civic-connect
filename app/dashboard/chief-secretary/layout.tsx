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
    title: "State Overview",
    href: "/dashboard/chief-secretary",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "All Complaints",
    href: "/dashboard/chief-secretary/complaints",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Escalated Issues",
    href: "/dashboard/chief-secretary/alerts",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    title: "State Heatmap",
    href: "/dashboard/chief-secretary/heatmap",
    icon: <Map className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/dashboard/chief-secretary/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function ChiefSecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="Chief Secretary" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
