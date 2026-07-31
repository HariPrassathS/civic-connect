import { getAreaOfficerMetrics } from "../queries";
import { redirect } from "next/navigation";

export default async function AreaOfficerTeamPage() {
  const metrics = await getAreaOfficerMetrics();
  
  if (!metrics) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team Performance</h2>
        <p className="text-muted-foreground">
          View resolution rates and activity for field workers in your ward.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        {metrics.teamStats.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No team members found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {metrics.teamStats.map((stat: any) => (
              <div key={stat.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p className="font-medium leading-none">{stat.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {stat.resolved} / {stat.total} tasks resolved
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold">{stat.rate}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Resolution Rate</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
