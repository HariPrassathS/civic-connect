-- Migration: Add RPC function for duplicate complaint detection
-- Uses PostGIS ST_DWithin + pg_trgm similarity

CREATE OR REPLACE FUNCTION find_duplicate_complaint(
  p_complaint_id uuid,
  p_title text,
  p_description text,
  p_category_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int DEFAULT 500,
  p_hours_window int DEFAULT 72,
  p_similarity_threshold real DEFAULT 0.3
)
RETURNS TABLE (id uuid, sim_score real) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    GREATEST(
      similarity(c.title, p_title),
      similarity(COALESCE(c.description, ''), p_description)
    ) AS sim_score
  FROM complaints c
  WHERE c.id != p_complaint_id
    AND c.category_id = p_category_id
    AND c.lat IS NOT NULL
    AND c.lng IS NOT NULL
    -- PostGIS: within radius (geography cast for meters)
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    -- Time window
    AND c.created_at >= (now() - (p_hours_window || ' hours')::interval)
    -- Text similarity
    AND GREATEST(
      similarity(c.title, p_title),
      similarity(COALESCE(c.description, ''), p_description)
    ) >= p_similarity_threshold
  ORDER BY sim_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
