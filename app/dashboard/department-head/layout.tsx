import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import {
  LayoutDashboard,
  FileText,
  LineChart,
  Wallet,
  BarChart3,
} from "lucide-react";

const navItems = [
  {
    title: "Overview",
    href: "/dashboard/department-head",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "All Complaints",
    href: "/dashboard/department-head/complaints",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Performance",
    href: "/dashboard/department-head/performance",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    title: "Resources",
    href: "/dashboard/department-head/resources",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/dashboard/department-head/reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default function DepartmentHeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell roleName="Department Head" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
