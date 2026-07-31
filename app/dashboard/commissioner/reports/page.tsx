import { getCommissionerMetrics } from "../queries";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CommissionerReportsPage() {
  const metrics = await getCommissionerMetrics();
  
  if (!metrics) {
    redirect("/login");
  }

  const total = metrics.complaints.length;
  const resolved = metrics.complaints.filter((c: any) => ["resolution_submitted", "verified", "closed"].includes(c.status)).length;
  const escalated = metrics.complaints.filter((c: any) => c.status === "escalated").length;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">City-Wide Reports</h2>
        <p className="text-muted-foreground">
          Analytics and high-level reporting across all jurisdictions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {total > 0 ? Math.round((resolved / total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall city average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-600">Active Escalations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{escalated}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        More detailed cross-departmental analytics and export functionality will be available in a future update.
      </div>
    </div>
  );
}
