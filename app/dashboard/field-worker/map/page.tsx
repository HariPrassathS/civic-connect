import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FieldWorkerMap } from "./field-worker-map";

export default async function FieldWorkerMapPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all tasks for this worker
  const { data: tasks } = await supabase
    .from("complaints")
    .select("id, title, status, priority, lat, lng, category:categories(name)")
    .eq("assigned_to", user.id)
    .not("lat", "is", null)
    .not("lng", "is", null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Map View</h1>
        <p className="text-sm text-muted-foreground">
          View all your assigned tasks on the map.
        </p>
      </div>

      <div className="h-[calc(100vh-200px)] w-full overflow-hidden rounded-xl border border-border">
        <FieldWorkerMap tasks={tasks || []} />
      </div>
    </div>
  );
}
