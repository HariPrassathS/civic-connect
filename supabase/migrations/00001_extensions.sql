-- Migration: Enable required extensions
-- pg_trgm: text similarity for duplicate complaint detection
-- postgis: geospatial queries (ST_DWithin) for nearby complaint detection

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
