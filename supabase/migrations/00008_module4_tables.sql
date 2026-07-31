-- Migration: Add work_logs and messages tables for Module 2 & 4
-- Field Worker Dashboard requirements

-- ============================================================
-- WORK LOGS
-- ============================================================
CREATE TABLE work_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  worker_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours        numeric(5,2) NOT NULL DEFAULT 0,
  note         text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_work_logs_complaint ON work_logs(complaint_id);
CREATE INDEX idx_work_logs_worker ON work_logs(worker_id);

ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Workers can read/write their own logs
CREATE POLICY "Workers can manage own work logs"
  ON work_logs FOR ALL
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Others assigned or area officers can read logs for complaints they can see
CREATE POLICY "Others can view work logs"
  ON work_logs FOR SELECT
  TO authenticated
  USING (true); -- Simplified for MVP: if you can see the complaint, you can see the logs (which is handled by UI routing)

-- ============================================================
-- MESSAGES (Private thread citizen <-> officials)
-- ============================================================
CREATE TABLE messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_complaint ON messages(complaint_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view messages on complaints they are part of
-- For MVP, we'll allow authenticated users to read and let the UI filter based on complaint access
CREATE POLICY "Authenticated users can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true); 

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());
