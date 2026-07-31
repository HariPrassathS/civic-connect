import { createClient } from "@/lib/supabase/server";

export async function getAreaOfficerMetrics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get AO's ward
  const { data: profile } = await supabase
    .from("profiles")
    .select("ward_id, department_id")
    .eq("id", user.id)
    .single();

  if (!profile?.ward_id) return null;

  // We fetch all complaints the AO can see (RLS handles department scoping).
  // We'll fetch the assigned_to's ward_id to filter in JS since it's simpler than complex PostgREST disambiguation for multiple FKs.
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select(`
      *,
      assigned_to_profile:profiles!complaints_assigned_to_fkey(id, ward_id, full_name, role)
    `);

  if (error || !complaints) {
    console.error("Error fetching complaints for AO:", error);
    return null;
  }

  // Filter complaints to those assigned to someone in this AO's ward, or unassigned.
  // Wait, if unassigned, we don't know the ward from the complaint since complaint lacks ward_id.
  // For MVP, assume complaints we see are either in our dept or we just filter by assigned_to's ward.
  const wardComplaints = complaints.filter((c: any) => 
    c.assigned_to_profile?.ward_id === profile.ward_id
  );

  const pendingTasks = wardComplaints.filter((c: any) => 
    ["received", "ai_processing", "assigned", "in_progress", "resolution_submitted"].includes(c.status)
  );

  const escalatedTasks = wardComplaints.filter((c: any) => c.status === "escalated");
  const resolvedTasks = wardComplaints.filter((c: any) => c.status === "resolved" || c.status === "closed" || c.status === "verified");

  // Team performance (Field workers in this ward)
  const teamMembersMap = new Map();
  wardComplaints.forEach((c: any) => {
    if (c.assigned_to_profile?.role === 'field_worker') {
      teamMembersMap.set(c.assigned_to_profile.id, c.assigned_to_profile);
    }
  });
  const teamMembers = Array.from(teamMembersMap.values());

  const teamStats = teamMembers.map((member: any) => {
    if (!member) return null;
    const memberComplaints = wardComplaints.filter((c: any) => c.assigned_to === member.id);
    const resolved = memberComplaints.filter((c: any) => c.status === "resolved" || c.status === "closed" || c.status === "verified").length;
    const total = memberComplaints.length;
    return {
      id: member.id,
      name: member.full_name || "Unknown",
      resolved,
      total,
      rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }).filter(Boolean);

  return {
    totalPending: pendingTasks.length,
    totalEscalated: escalatedTasks.length,
    totalResolved: resolvedTasks.length,
    recentPending: pendingTasks.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
    allComplaints: wardComplaints.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    teamStats,
  };
}
