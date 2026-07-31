-- ============================================================
-- AI INSIGHTS
-- Caches daily AI-generated insights to avoid excessive LLM calls
-- ============================================================
CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_text text NOT NULL,
  target_role text, -- optional, if insight is specific to a role (e.g., 'department_head')
  target_id uuid, -- optional, if insight is specific to a department or ward
  created_at timestamptz DEFAULT now()
);

-- RLS: Insights are generally read-only for authenticated officials
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officials can view AI insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (
    get_my_role() NOT IN ('citizen', 'field_worker')
  );

-- Only service role can insert/update (done via API route)
