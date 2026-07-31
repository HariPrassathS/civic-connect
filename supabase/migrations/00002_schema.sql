-- Migration: Core schema — all tables from PROJECT.md §4
-- Order: departments → wards → profiles → categories → complaints → complaint_media
--        → complaint_updates → escalation_logs → feedback → notifications

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  city       text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- WARDS
-- ============================================================
CREATE TABLE wards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  area_officer_id uuid,  -- FK added after profiles table exists
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- PROFILES (linked 1:1 with auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name     text,
  phone         text,
  role          text NOT NULL DEFAULT 'citizen'
                CHECK (role IN (
                  'citizen','field_worker','area_officer','department_head',
                  'commissioner','district_collector','chief_secretary',
                  'chief_minister','admin'
                )),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  ward_id       uuid REFERENCES wards(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- Now we can add the FK from wards → profiles
ALTER TABLE wards
  ADD CONSTRAINT fk_wards_area_officer
  FOREIGN KEY (area_officer_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- CATEGORIES (self-referencing for subcategories)
-- ============================================================
CREATE TABLE categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE TABLE complaints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category_id      uuid REFERENCES categories(id) ON DELETE SET NULL,
  title            text NOT NULL,
  description      text,
  lat              double precision,
  lng              double precision,
  visibility       text NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('public','private')),
  status           text NOT NULL DEFAULT 'received'
                   CHECK (status IN (
                     'received','ai_processing','assigned','in_progress',
                     'resolution_submitted','verified','closed','escalated'
                   )),
  priority         text CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  escalation_level int NOT NULL DEFAULT 1,
  sla_deadline     timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Auto-update updated_at on complaints
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMPLAINT MEDIA
-- ============================================================
CREATE TABLE complaint_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  url          text NOT NULL,
  type         text, -- 'image', 'video', 'document'
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- COMPLAINT UPDATES (audit log of status changes)
-- ============================================================
CREATE TABLE complaint_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note         text,
  status_from  text,
  status_to    text,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- ESCALATION LOGS
-- ============================================================
CREATE TABLE escalation_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_level   int NOT NULL,
  to_level     int NOT NULL,
  reason       text,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- FEEDBACK (citizen ratings after resolution)
-- ============================================================
CREATE TABLE feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  rating       int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      text,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text,
  channel    text NOT NULL DEFAULT 'in_app'
             CHECK (channel IN ('in_app','email','sms','push')),
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
CREATE INDEX idx_complaints_citizen     ON complaints(citizen_id);
CREATE INDEX idx_complaints_assigned    ON complaints(assigned_to);
CREATE INDEX idx_complaints_status      ON complaints(status);
CREATE INDEX idx_complaints_category    ON complaints(category_id);
CREATE INDEX idx_complaints_created     ON complaints(created_at DESC);
CREATE INDEX idx_complaint_updates_cid  ON complaint_updates(complaint_id);
CREATE INDEX idx_complaint_media_cid    ON complaint_media(complaint_id);
CREATE INDEX idx_escalation_logs_cid    ON escalation_logs(complaint_id);
CREATE INDEX idx_feedback_cid           ON feedback(complaint_id);
CREATE INDEX idx_notifications_user     ON notifications(user_id, read);
CREATE INDEX idx_profiles_role          ON profiles(role);
CREATE INDEX idx_profiles_department    ON profiles(department_id);
CREATE INDEX idx_profiles_ward          ON profiles(ward_id);
CREATE INDEX idx_categories_parent      ON categories(parent_id);

-- pg_trgm index for text similarity on complaint titles
CREATE INDEX idx_complaints_title_trgm  ON complaints USING gin (title gin_trgm_ops);
