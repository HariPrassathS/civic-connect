/**
 * Duplicate complaint detection using PostGIS + pg_trgm.
 * Finds complaints in the same category, within N meters, with similar
 * title/description, created in the last 72 hours.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const DUPLICATE_RADIUS_METERS = 500;
const DUPLICATE_WINDOW_HOURS = 72;
const SIMILARITY_THRESHOLD = 0.65; // pg_trgm similarity threshold

export interface DuplicateResult {
  isDuplicate: boolean;
  duplicateOf: string | null; // complaint ID
  similarity: number;
}

export async function checkDuplicate(
  supabase: SupabaseClient,
  complaint: {
    id: string;
    title: string;
    description: string | null;
    category_id: string | null;
    lat: number | null;
    lng: number | null;
  }
): Promise<DuplicateResult> {
  // Can't check without location or category
  if (!complaint.lat || !complaint.lng || !complaint.category_id) {
    return { isDuplicate: false, duplicateOf: null, similarity: 0 };
  }

  try {
    // Use raw SQL for PostGIS + pg_trgm combo query
    const { data, error } = await supabase.rpc("find_duplicate_complaint", {
      p_complaint_id: complaint.id,
      p_title: complaint.title,
      p_description: complaint.description || "",
      p_category_id: complaint.category_id,
      p_lat: complaint.lat,
      p_lng: complaint.lng,
      p_radius_meters: DUPLICATE_RADIUS_METERS,
      p_hours_window: DUPLICATE_WINDOW_HOURS,
      p_similarity_threshold: SIMILARITY_THRESHOLD,
    });

    if (error) {
      console.error("Duplicate check RPC error:", error);
      return { isDuplicate: false, duplicateOf: null, similarity: 0 };
    }

    if (data && data.length > 0) {
      return {
        isDuplicate: true,
        duplicateOf: data[0].id,
        similarity: data[0].sim_score,
      };
    }
  } catch (err) {
    console.error("Duplicate check failed:", err);
  }

  return { isDuplicate: false, duplicateOf: null, similarity: 0 };
}
