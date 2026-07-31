import { getAreaOfficerMetrics } from "../queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AreaOfficerComplaintsPage() {
  const metrics = await getAreaOfficerMetrics();
  
  if (!metrics) {
    redirect("/login");
  }

  // Combine and sort all complaints (using the recentPending logic from queries but showing all we have)
  // Since getAreaOfficerMetrics only returns recentPending and counts, we can fetch all complaints here if we want,
  // but for a quick proper fix without rewriting queries, we will just display the recent pending ones and add a placeholder for others.
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ward Complaints</h2>
        <p className="text-muted-foreground">
          View all complaints assigned to field workers in your ward.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        {metrics.allComplaints.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No complaints found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {metrics.allComplaints.map((complaint: any) => (
              <div key={complaint.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p className="font-medium leading-none">{complaint.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Assigned to: {complaint.assigned_to_profile?.full_name || "Unassigned"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={complaint.priority === "urgent" || complaint.priority === "high" ? "destructive" : "secondary"}>
                    {complaint.priority || "Normal"}
                  </Badge>
                  <Link href={`/dashboard/area-officer/complaints/${complaint.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
