import { redirect } from "next/navigation";
import { getDepartmentHeadMetrics } from "./queries";
import { StatusWidgets } from "@/components/analytics/status-widgets";
import { TrendCharts } from "@/components/analytics/trend-charts";
import { DynamicHeatmap } from "@/components/analytics/dynamic-heatmap";
import { AIInsights } from "@/components/analytics/ai-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DepartmentHeadDashboard() {
  const metrics = await getDepartmentHeadMetrics();

  if (!metrics) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Department Overview</h2>
        <p className="text-muted-foreground">
          Department-wide analytics, SLA compliance, and AI insights.
        </p>
      </div>

      {/* 1. Real-time Status Widgets */}
      <StatusWidgets initialComplaints={metrics.complaints as any} />

      {/* 2. AI Insights Panel */}
      <AIInsights />

      {/* 3. Trend Charts */}
      <TrendCharts complaints={metrics.complaints} categories={metrics.categories} />

      <div className="grid gap-4 md:grid-cols-7">
        {/* 4. Heatmap */}
        <div className="md:col-span-4">
          <DynamicHeatmap points={metrics.points} />
        </div>

        {/* Recent Escalated (Department Head specific) */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Escalations</CardTitle>
            <CardDescription>
              Requires immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.escalatedComplaints.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No active escalations.
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.escalatedComplaints.map((c: any) => (
                  <div key={c.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{c.title}</p>
                      <Badge variant="destructive" className="mt-1">Escalated</Badge>
                    </div>
                    <Link href={`/dashboard/department-head/complaints/${c.id}`}>
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
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
