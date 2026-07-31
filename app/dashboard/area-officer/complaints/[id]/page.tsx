import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/complaints/status-badge";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { OfficerControls } from "./officer-controls";

export default async function AreaOfficerComplaintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch task and related data
  const { data: task, error } = await supabase
    .from("complaints")
    .select(`
      *,
      category:categories(name),
      media:complaint_media(url, type),
      workLogs:work_logs(*),
      messages(id, content, created_at, sender:profiles(role, full_name)),
      assignedWorker:profiles!complaints_assigned_to_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (error || !task) {
    return <div className="p-4 text-red-500">Complaint not found or access denied.</div>;
  }

  // Sort messages
  const sortedMessages = [...(task.messages || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="mx-auto max-w-2xl pb-20 p-4 sm:p-6 lg:p-8">
      {/* Back button and header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/area-officer/complaints" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to complaints
        </Link>
        <div className="ml-auto">
          <StatusBadge status={task.status as any} />
        </div>
      </div>

      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold md:text-3xl">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {task.category && (
            <div className="inline-flex rounded bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {task.category.name}
            </div>
          )}
          {task.assignedWorker && (
            <div className="text-sm text-muted-foreground">
              Assigned to: <span className="font-medium text-foreground">{task.assignedWorker.full_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-border/50 bg-card p-5 text-sm text-card-foreground shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{task.description}</p>
            
            {task.lat && task.lng && (
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-500">
                <MapPin className="h-4 w-4" />
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
            )}
          </div>

          {/* Media */}
          {task.media && task.media.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attached Media</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {task.media.map((m: any, i: number) => (
                  m.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div key={i} className="group relative aspect-video overflow-hidden rounded-xl border border-border/50 bg-muted">
                      <img src={m.url} alt="media" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  ) : m.type === "audio" ? (
                    <div key={i} className="flex flex-col justify-center rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                      <span className="mb-2 text-xs font-semibold text-muted-foreground">Voice Note:</span>
                      <audio src={m.url} controls className="w-full" />
                    </div>
                  ) : (
                    <video key={i} src={m.url} controls className="aspect-video w-full rounded-xl object-cover border border-border/50" />
                  )
                ))}
              </div>
            </div>
          )}

          {/* Work Logs */}
          {task.workLogs && task.workLogs.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Work Logs</h3>
              <div className="space-y-3">
                {task.workLogs.map((log: any) => (
                  <div key={log.id} className="rounded-xl border border-border/50 bg-card p-4 text-sm shadow-sm">
                    <p className="whitespace-pre-wrap">{log.note}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{log.hours_spent} hours spent</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <OfficerControls 
            complaintId={task.id}
            currentStatus={task.status}
          />

          {/* AI Summary */}
          {task.ai_summary && (
            <div className="rounded-xl border border-border/50 bg-blue-500/5 p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-500">AI Analysis</h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                {Array.isArray(task.ai_summary) ? (
                  task.ai_summary.filter(Boolean).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{task.ai_summary}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
