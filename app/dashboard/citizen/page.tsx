import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import type { ComplaintStatus, Visibility } from "@/types/database";

export default async function CitizenDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch citizen's complaints with category name and upvote count
  const { data: complaints } = await supabase
    .from("complaints")
    .select(
      `
      id, title, status, visibility, created_at,
      category:categories(name),
      upvotes:complaint_upvotes(count)
    `
    )
    .eq("citizen_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Issues</h1>
          <p className="text-sm text-muted-foreground">
            {complaints?.length ?? 0} issue
            {(complaints?.length ?? 0) !== 1 ? "s" : ""} submitted
          </p>
        </div>
        <Link href="/submit-issue">
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New Issue
          </Button>
        </Link>
      </div>

      {!complaints || complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="mb-1 font-semibold">No issues yet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Submit your first civic issue to get started
          </p>
          <Link href="/submit-issue">
            <Button className="gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              <Plus className="h-4 w-4" />
              Submit Issue
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => (
            <ComplaintCard
              key={c.id}
              id={c.id}
              title={c.title}
              status={c.status as ComplaintStatus}
              categoryName={c.category?.name}
              visibility={c.visibility as Visibility}
              createdAt={c.created_at}
              upvoteCount={c.upvotes?.[0]?.count ?? 0}
              href={`/dashboard/citizen/complaints/${c.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
