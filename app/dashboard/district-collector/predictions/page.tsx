import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { PredictionsDashboard } from "./predictions-dashboard";
import { redirect } from "next/navigation";

export default async function PredictiveAnalyticsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch recent complaints for heatmap
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: complaints } = await supabase
    .from("complaints")
    .select("lat, lng, status, category:categories(name)")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .not("lat", "is", null)
    .not("lng", "is", null);

  // Fetch predictive alerts using service role to bypass RLS
  const serviceClient = createServiceRoleClient();
  const { data: alerts } = await serviceClient
    .from("predictive_alerts")
    .select("*, ward:wards(name), category:categories(name)")
    .order("confidence_score", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Predictive Analytics</h2>
        <p className="text-muted-foreground">
          AI-driven insights and heatmaps based on historical complaint density to predict and prevent infrastructure failures.
        </p>
      </div>

      <PredictionsDashboard 
        complaints={complaints || []} 
        alerts={alerts || []} 
      />
    </div>
  );
}
