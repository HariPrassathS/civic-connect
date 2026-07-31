-- ============================================================
-- SETTINGS TABLE
-- Stores configurable escalation SLA hours and other system settings.
-- Key-value pairs so it's extensible without schema changes.
-- ============================================================
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Seed default SLA values from PROJECT.md §5
INSERT INTO settings (key, value, description) VALUES
  ('sla_hours_level_1', '24'::jsonb, 'SLA hours for Level 1 — Field Worker'),
  ('sla_hours_level_2', '24'::jsonb, 'SLA hours for Level 2 — Zonal Officer'),
  ('sla_hours_level_3', '48'::jsonb, 'SLA hours for Level 3 — Department Head'),
  ('sla_hours_level_4', '72'::jsonb, 'SLA hours for Level 4 — Regional Deputy Commissioner'),
  ('sla_hours_level_5', 'null'::jsonb, 'SLA hours for Level 5 — GCC / Municipal Commissioner (manual)'),
  ('sla_hours_level_6', 'null'::jsonb, 'SLA hours for Level 6 — District Collector (manual)'),
  ('sla_hours_level_7', 'null'::jsonb, 'SLA hours for Level 7 — Chief Secretary (manual)'),
  ('sla_hours_level_8', 'null'::jsonb, 'SLA hours for Level 8 — Chief Minister (manual)');

-- RLS: Only admins can read/write settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Allow officials to READ settings (needed by escalation engine)
CREATE POLICY "Officials can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_settings_key ON settings(key);
