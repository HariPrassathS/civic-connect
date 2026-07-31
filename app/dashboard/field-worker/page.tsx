import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/complaints/status-badge";
import type { ComplaintStatus, Priority } from "@/types/database";
import { cn } from "@/lib/utils";

// Helper for priority colors
function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  const colors = {
    urgent: "bg-red-500/15 text-red-500 border-red-500/30",
    high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    low: "bg-green-500/15 text-green-500 border-green-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        colors[priority]
      )}
    >
      {priority}
    </span>
  );
}

export default async function FieldWorkerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { tab = "assigned" } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Determine which statuses to fetch based on tab
  let statusFilter: ComplaintStatus[] = [];
  if (tab === "assigned") {
    statusFilter = ["assigned"];
  } else if (tab === "active") {
    statusFilter = ["in_progress"];
  } else if (tab === "completed") {
    statusFilter = ["resolution_submitted", "verified", "closed"];
  }

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("complaints")
    .select(
      `
      id, title, status, priority, created_at, sla_deadline,
      category:categories(name)
    `
    )
    .eq("assigned_to", user.id)
    .in("status", statusFilter)
    .order("priority", { ascending: false }) // Postgres sorts strings, this isn't perfect for enum, but ok for MVP
    .order("created_at", { ascending: false });

  // Mobile-first tab navigation
  const tabs = [
    { id: "assigned", label: "New Tasks" },
    { id: "active", label: "In Progress" },
    { id: "completed", label: "Done" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Manage and update your assigned civic issues.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-full overflow-x-auto rounded-xl border border-border/50 bg-card/30 p-1 backdrop-blur-sm">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/field-worker?tab=${t.id}`}
            replace
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all",
              tab === t.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Task List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!tasks || tasks.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <CheckCircle2 className="mb-3 h-10 w-10 opacity-20" />
            <p>No {tab} tasks found.</p>
          </div>
        ) : (
          tasks.map((task: any) => {
            const isOverdue =
              task.sla_deadline && new Date(task.sla_deadline) < new Date();

            return (
              <Link
                key={task.id}
                href={`/dashboard/field-worker/complaints/${task.id}`}
                className="group flex flex-col justify-between rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.98]"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <PriorityBadge priority={task.priority as Priority} />
                    <StatusBadge status={task.status as ComplaintStatus} />
                  </div>
                  <h3 className="line-clamp-2 font-medium leading-tight text-foreground group-hover:text-blue-500">
                    {task.title}
                  </h3>
                  {task.category && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.category.name}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(task.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  {task.sla_deadline && (
                    <div
                      className={cn(
                        "flex items-center gap-1 font-medium",
                        isOverdue ? "text-red-500" : "text-emerald-500"
                      )}
                    >
                      {isOverdue ? (
                        <AlertCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {isOverdue ? "Overdue" : "On Track"}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
