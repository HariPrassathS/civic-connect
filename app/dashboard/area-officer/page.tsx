import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAreaOfficerMetrics } from "./queries";
import { AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

export default async function AreaOfficerDashboard() {
  const metrics = await getAreaOfficerMetrics();

  if (!metrics) {
    // If not found or not authorized, redirect to login or show error
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ward Overview</h2>
          <p className="text-muted-foreground">
            Monitor complaints and team performance in your jurisdiction.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPending}</div>
            <p className="text-xs text-muted-foreground">Awaiting resolution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Escalated
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {metrics.totalEscalated}
            </div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalResolved}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.teamStats.length}</div>
            <p className="text-xs text-muted-foreground">Field workers assigned</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Recent Pending Complaints</CardTitle>
            <CardDescription>
              Latest unresolved issues in your ward.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recentPending.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No pending complaints.
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.recentPending.map((complaint: any) => (
                  <div
                    key={complaint.id}
                    className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                  >
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
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>
              Resolution rates by field worker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.teamStats.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No team members found.
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.teamStats.map((stat: any) => (
                  <div key={stat.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{stat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.resolved} / {stat.total} resolved
                      </p>
                    </div>
                    <div className="font-medium">
                      {stat.rate}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
