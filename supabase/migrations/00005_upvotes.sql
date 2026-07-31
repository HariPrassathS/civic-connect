-- Migration: Add complaint_upvotes table for public complaint upvoting
-- Module 1: Issue Management

CREATE TABLE complaint_upvotes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (complaint_id, user_id)
);

CREATE INDEX idx_upvotes_complaint ON complaint_upvotes(complaint_id);
CREATE INDEX idx_upvotes_user      ON complaint_upvotes(user_id);

-- RLS
ALTER TABLE complaint_upvotes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see upvotes on public complaints
CREATE POLICY "Anyone can view upvotes on public complaints"
  ON complaint_upvotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_upvotes.complaint_id
      AND c.visibility = 'public'
    )
  );

-- Users can see their own upvotes (including private complaints they own)
CREATE POLICY "Users can view own upvotes"
  ON complaint_upvotes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can upvote public complaints
CREATE POLICY "Users can upvote public complaints"
  ON complaint_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_upvotes.complaint_id
      AND c.visibility = 'public'
    )
  );

-- Users can remove their own upvotes
CREATE POLICY "Users can remove own upvotes"
  ON complaint_upvotes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
