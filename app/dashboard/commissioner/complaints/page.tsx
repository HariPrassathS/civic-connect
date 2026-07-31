import { getCommissionerMetrics } from "../queries";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function CommissionerComplaintsPage() {
  const metrics = await getCommissionerMetrics();
  
  if (!metrics) {
    redirect("/login");
  }

  // Group by status for a simple dashboard view
  const pending = metrics.complaints.filter((c: any) => ["received", "ai_processing", "assigned", "in_progress"].includes(c.status));
  const escalated = metrics.complaints.filter((c: any) => c.status === "escalated");
  const resolved = metrics.complaints.filter((c: any) => ["resolution_submitted", "verified", "closed"].includes(c.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">City-Wide Complaints</h2>
        <p className="text-muted-foreground">
          Overview of all complaints across the city.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2">Pending ({pending.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pending.map((c: any) => (
              <div key={c.id} className="p-3 bg-muted rounded-md text-sm border">
                <div className="font-medium truncate">{c.title}</div>
                <Badge variant="outline" className="mt-2">{c.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2 text-red-600">Escalated ({escalated.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {escalated.map((c: any) => (
              <div key={c.id} className="p-3 bg-red-500/10 rounded-md text-sm border border-red-500/20">
                <div className="font-medium truncate text-red-700 dark:text-red-400">{c.title}</div>
                <Badge variant="destructive" className="mt-2">{c.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2">Resolved ({resolved.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {resolved.map((c: any) => (
              <div key={c.id} className="p-3 bg-muted rounded-md text-sm border">
                <div className="font-medium truncate text-muted-foreground">{c.title}</div>
                <Badge variant="outline" className="mt-2 text-muted-foreground">{c.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
