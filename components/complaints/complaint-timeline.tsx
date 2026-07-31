import { Clock } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { ComplaintUpdate, ComplaintStatus } from "@/types/database";

interface ComplaintTimelineProps {
  updates: ComplaintUpdate[];
}

export function ComplaintTimeline({ updates }: ComplaintTimelineProps) {
  if (updates.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No updates yet.
      </p>
    );
  }

  const sorted = [...updates].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {sorted.map((update, i) => (
        <div key={update.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Dot */}
          <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {update.status_to && (
                <StatusBadge
                  status={update.status_to as ComplaintStatus}
                />
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(update.created_at)}
              </span>
            </div>
            {update.note && (
              <p className="mt-1 text-sm text-foreground/80">{update.note}</p>
            )}
            {update.status_from && update.status_to && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatStatus(update.status_from)} →{" "}
                {formatStatus(update.status_to)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
