import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/complaints/status-badge";
import { UpvoteButton } from "@/components/complaints/upvote-button";
import { MapPin, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function CommunityIssuesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch public complaints with upvotes count
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select(`
      *,
      category:categories(name),
      upvotes:complaint_upvotes(count)
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  // Fetch current user's upvotes
  const { data: userUpvotes } = await supabase
    .from("complaint_upvotes")
    .select("complaint_id")
    .eq("user_id", user.id);

  const upvotedComplaintIds = new Set(userUpvotes?.map((u) => u.complaint_id) || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Community Issues</h2>
        <p className="text-muted-foreground">
          View and upvote public complaints reported by others in your city. Upvoting helps prioritize urgent issues.
        </p>
      </div>

      {!complaints || complaints.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-medium">No public issues found</h3>
          <p className="text-sm text-muted-foreground">There are currently no public complaints to display.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {complaints.map((complaint: any) => {
            const initialUpvotes = complaint.upvotes?.[0]?.count || 0;
            const initiallyUpvoted = upvotedComplaintIds.has(complaint.id);

            return (
              <div
                key={complaint.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
              >
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <StatusBadge status={complaint.status} />
                    {complaint.category && (
                      <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {complaint.category.name}
                      </span>
                    )}
                  </div>
                  
                  <Link href={`/dashboard/citizen/complaints/${complaint.id}`} className="hover:underline">
                    <h3 className="line-clamp-2 font-semibold">{complaint.title}</h3>
                  </Link>
                  
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {complaint.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{complaint.lat && complaint.lng ? "Location provided" : "No location"}</span>
                    </div>
                    <span>
                      {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
                  <UpvoteButton
                    complaintId={complaint.id}
                    initialUpvotes={initialUpvotes}
                    initiallyUpvoted={initiallyUpvoted}
                  />
                  
                  <Link href={`/dashboard/citizen/complaints/${complaint.id}`}>
                    <span className="text-xs font-medium text-primary hover:underline">View Details</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
