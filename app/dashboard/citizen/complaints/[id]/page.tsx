import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Eye, EyeOff, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/complaints/status-badge";
import { ComplaintTimeline } from "@/components/complaints/complaint-timeline";
import { UpvoteButton } from "@/components/complaints/upvote-button";
import { ReopenButton } from "./reopen-button";
import { ComplaintMap } from "./complaint-map";
import { ResolutionReviewBlock } from "./resolution-review-block";
import { CitizenChat } from "./citizen-chat";
import type { ComplaintStatus, ComplaintMedia, ComplaintUpdate } from "@/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ComplaintDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch complaint with category, media, updates
  const { data: complaint } = await supabase
    .from("complaints")
    .select(
      `
      *,
      category:categories(name),
      media:complaint_media(*),
      updates:complaint_updates(*),
      messages(id, content, created_at, sender:profiles(role, full_name))
    `
    )
    .eq("id", id)
    .single();

  if (!complaint) notFound();

  // Fetch upvote count + user's upvote status
  const { count: upvoteCount } = await supabase
    .from("complaint_upvotes")
    .select("*", { count: "exact", head: true })
    .eq("complaint_id", id);

  const { data: userUpvote } = await supabase
    .from("complaint_upvotes")
    .select("id")
    .eq("complaint_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = complaint.citizen_id === user.id;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/citizen"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to My Issues
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {complaint.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {complaint.category && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {(complaint.category as any).name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(complaint.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                {complaint.visibility === "public" ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                {complaint.visibility}
              </span>
            </div>
          </div>
          <StatusBadge status={complaint.status as ComplaintStatus} />
        </div>
      </div>

      {/* Description */}
      {complaint.description && (
        <div className="mb-6 rounded-xl border border-border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
          <h2 className="mb-2 text-sm font-medium">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">
            {complaint.description}
          </p>
        </div>
      )}

      {/* Government Allocated Fund Banner */}
      {(() => {
        const fundUpdate = (complaint.updates as ComplaintUpdate[])?.find(u => u.note && u.note.includes("Government Fund Allocated"));
        const match = complaint.ai_summary?.match(/\[FUND:\s*([^\]]+)\]/);
        const displayFund = fundUpdate?.note?.split(":")?.[1]?.trim() || (match ? match[1] : null);

        if (!displayFund) return null;

        return (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white shadow-sm">
                ₹
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Government Expenditure & Project Funding Declared
                </h3>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {displayFund}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Officially assigned by the field engineering unit for infrastructure restoration and execution.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Media gallery */}
      {complaint.media && (complaint.media as ComplaintMedia[]).length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium">Attachments</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(complaint.media as ComplaintMedia[]).map((m) => (
              <div
                key={m.id}
                className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt="Complaint attachment"
                    className="h-full w-full object-cover"
                  />
                ) : m.type === "video" ? (
                  <video
                    src={m.url}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <audio src={m.url} controls className="m-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      {complaint.lat && complaint.lng && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="h-4 w-4 text-blue-500" />
            Location
          </h2>
          <ComplaintMap lat={complaint.lat} lng={complaint.lng} />
        </div>
      )}

      {/* Resolution Review */}
      {isOwner && complaint.status === "resolution_submitted" && (
        <ResolutionReviewBlock complaintId={complaint.id} />
      )}

      {/* Actions bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {complaint.visibility === "public" && (
          <UpvoteButton
            complaintId={complaint.id}
            initialUpvotes={upvoteCount ?? 0}
            initiallyUpvoted={!!userUpvote}
          />
        )}
        {isOwner && complaint.status === "closed" && (
          <ReopenButton complaintId={complaint.id} />
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card/50 p-4 mb-6">
        <h2 className="mb-4 text-sm font-medium">Activity Timeline</h2>
        <ComplaintTimeline
          updates={(complaint.updates as ComplaintUpdate[]) ?? []}
        />
      </div>

      {/* Citizen Chat */}
      {isOwner && (
        <CitizenChat 
          complaintId={complaint.id} 
          messages={[...(complaint.messages || [])].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )}
        />
      )}
    </div>
  );
}
