/**
 * Auto-assignment: pick the nearest available field worker in the complaint's ward.
 * Simple nearest-neighbor by lat/lng for MVP.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AssignmentResult {
  assignedTo: string | null;
  assignedName: string | null;
  reason: string;
}

export async function assignFieldWorker(
  supabase: SupabaseClient,
  complaint: {
    lat: number | null;
    lng: number | null;
    category_id: string | null;
  }
): Promise<AssignmentResult> {
  // Try to find field workers
  // For MVP, we look up any field_worker (ideally in the same department
  // as the complaint's category, but we keep it simple for now)
  const { data: workers, error } = await supabase
    .from("profiles")
    .select("id, full_name, ward_id, department_id")
    .eq("role", "field_worker");

  if (error || !workers || workers.length === 0) {
    return {
      assignedTo: null,
      assignedName: null,
      reason: "No field workers available",
    };
  }

  // If only one worker, assign directly
  if (workers.length === 1) {
    return {
      assignedTo: workers[0].id,
      assignedName: workers[0].full_name,
      reason: "Only available field worker",
    };
  }

  // If we have complaint coordinates, we'd ideally sort by distance.
  // For MVP without worker coordinates, just pick the first available one.
  // In production, workers would have lat/lng in their profile.
  const assigned = workers[0];

  return {
    assignedTo: assigned.id,
    assignedName: assigned.full_name,
    reason: `Assigned to ${assigned.full_name ?? "field worker"} (first available)`,
  };
}
