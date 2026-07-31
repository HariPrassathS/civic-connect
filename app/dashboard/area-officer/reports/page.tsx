import { getAreaOfficerMetrics } from "../queries";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AreaOfficerReportsPage() {
  const metrics = await getAreaOfficerMetrics();
  
  if (!metrics) {
    redirect("/login");
  }

  const totalComplaints = metrics.totalPending + metrics.totalEscalated + metrics.totalResolved;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ward Reports</h2>
        <p className="text-muted-foreground">
          Analytics and reporting for your jurisdiction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalComplaints > 0 
                ? Math.round((metrics.totalResolved / totalComplaints) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Of all assigned complaints</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Escalations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.totalEscalated}
            </div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalPending}
            </div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        More detailed PDF and CSV reports will be available in a future update.
      </div>
    </div>
  );
}
