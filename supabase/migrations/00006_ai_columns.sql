-- Migration: Add AI processing columns to complaints
-- Module 3: AI layer for new complaints

-- Link duplicate complaints
ALTER TABLE complaints
  ADD COLUMN duplicate_of uuid REFERENCES complaints(id) ON DELETE SET NULL;

-- AI sentiment analysis result
ALTER TABLE complaints
  ADD COLUMN sentiment text CHECK (sentiment IN ('positive','neutral','negative','angry'));

-- AI processing summary / notes
ALTER TABLE complaints
  ADD COLUMN ai_summary text;

-- Index for duplicate lookup
CREATE INDEX idx_complaints_duplicate_of ON complaints(duplicate_of);
