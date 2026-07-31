-- Migration: Predictive Alerts

CREATE TABLE predictive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  ward_id uuid REFERENCES wards(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  recommended_action text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE predictive_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictive alerts are viewable by officials"
  ON predictive_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('area_officer', 'department_head', 'commissioner', 'district_collector', 'chief_secretary', 'chief_minister', 'admin')
    )
  );

CREATE POLICY "Predictive alerts are insertable by service role"
  ON predictive_alerts FOR INSERT
  WITH CHECK (true);
