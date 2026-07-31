import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/complaints/status-badge";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { TaskControls } from "./task-controls";

export default async function FieldWorkerTaskPage({
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
      messages(id, content, created_at, sender:profiles(role, full_name))
    `)
    .eq("id", id)
    .single();

  if (error || !task) {
    return <div className="p-4 text-red-500">Task not found or access denied.</div>;
  }

  // Ensure this worker is assigned
  if (task.assigned_to !== user.id) {
    return <div className="p-4 text-red-500">You are not assigned to this task.</div>;
  }

  // Sort messages
  const sortedMessages = [...(task.messages || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="mx-auto max-w-md pb-20">
      {/* Mobile-friendly sticky header */}
      <div className="sticky top-0 z-40 mb-4 flex items-center gap-3 border-b border-border/40 bg-background/80 p-4 backdrop-blur-xl md:hidden -mx-4 -mt-6">
        <Link href="/dashboard/field-worker" className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 overflow-hidden">
          <h1 className="truncate text-sm font-bold">{task.title}</h1>
        </div>
        <StatusBadge status={task.status as any} />
      </div>

      <div className="hidden md:flex mb-6 items-center gap-4">
        <Link href="/dashboard/field-worker" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </Link>
        <div className="ml-auto">
          <StatusBadge status={task.status as any} />
        </div>
      </div>

      <h1 className="mb-2 hidden md:block text-2xl font-bold">{task.title}</h1>
      
      {task.category && (
        <div className="mb-4 inline-flex rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {task.category.name}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-border/50 bg-card/30 p-4 text-sm text-card-foreground">
        <p className="whitespace-pre-wrap">{task.description}</p>
        
        {task.lat && task.lng && (
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-500">
            <MapPin className="h-4 w-4" />
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`} 
              target="_blank" 
              rel="noreferrer"
              className="hover:underline"
            >
              Get Directions
            </a>
          </div>
        )}
      </div>

      {/* Existing Media */}
      {task.media && task.media.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attached Media</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {task.media.map((m: any, i: number) => (
              m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={m.url} alt="media" className="aspect-video w-full rounded-lg object-cover border border-border/50 shadow-sm" />
              ) : m.type === "audio" ? (
                <div key={i} className="flex flex-col justify-center rounded-lg border border-border/50 bg-card/50 p-3 shadow-sm">
                  <span className="mb-2 text-xs font-semibold text-muted-foreground">Citizen Voice Note:</span>
                  <audio src={m.url} controls className="w-full" />
                </div>
              ) : (
                <video key={i} src={m.url} controls className="aspect-video w-full rounded-lg object-cover border border-border/50" />
              )
            ))}
          </div>
        </div>
      )}

      {/* Interactive Controls */}
      <TaskControls 
        complaintId={task.id} 
        currentStatus={task.status} 
        messages={sortedMessages}
        workLogs={task.workLogs || []}
        hasInitialImage={task.media?.some((m: any) => m.type === "image") || false}
        hasResolutionPhoto={(task.media?.filter((m: any) => m.type === "image").length ?? 0) >= 2}
        categoryName={task.category?.name || ""}
        complaintTitle={task.title || ""}
        complaintDescription={task.description || ""}
      />
    </div>
  );
}
