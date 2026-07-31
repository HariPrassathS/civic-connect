import Link from "next/link";
import { MapPin, Calendar, Eye, EyeOff } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { ComplaintStatus, Visibility } from "@/types/database";

interface ComplaintCardProps {
  id: string;
  title: string;
  status: ComplaintStatus;
  categoryName?: string;
  visibility: Visibility;
  createdAt: string;
  upvoteCount?: number;
  href: string;
}

export function ComplaintCard({
  id,
  title,
  status,
  categoryName,
  visibility,
  createdAt,
  upvoteCount,
  href,
}: ComplaintCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {categoryName && (
              <span className="rounded-md bg-muted px-1.5 py-0.5">
                {categoryName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="flex items-center gap-1">
              {visibility === "public" ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              {visibility}
            </span>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {typeof upvoteCount === "number" && upvoteCount > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          👍 {upvoteCount} upvote{upvoteCount !== 1 ? "s" : ""}
        </div>
      )}
    </Link>
  );
}
