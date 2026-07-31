import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@/types/database";

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; className: string }
> = {
  received: {
    label: "Received",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  ai_processing: {
    label: "AI Processing",
    className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  assigned: {
    label: "Assigned",
    className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  resolution_submitted: {
    label: "Resolution Submitted",
    className: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  },
  verified: {
    label: "Verified",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
  escalated: {
    label: "Escalated",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ComplaintStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.received;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
