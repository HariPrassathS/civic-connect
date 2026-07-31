import { createClient } from "@/lib/supabase/server";

export async function getDepartmentHeadMetrics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", user.id)
    .single();

  if (!profile?.department_id) return null;

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, status, created_at, updated_at, category_id, lat, lng, priority, title");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");

  if (error || !complaints) {
    console.error("Error fetching complaints for Dept Head:", error);
    return null;
  }

  const points = complaints.map(c => ({
    lat: c.lat,
    lng: c.lng,
    intensity: c.status === "escalated" ? 1.0 : 0.5
  }));

  const escalatedComplaints = complaints
    .filter(c => c.status === "escalated")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    complaints,
    categories: categories || [],
    points,
    escalatedComplaints
  };
}
