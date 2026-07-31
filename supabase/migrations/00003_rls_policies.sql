-- Migration: Row Level Security policies for all tables
-- Pattern:
--   Citizens: own data + public complaints
--   Officials: data in their dept/ward/assigned complaints
--   Admin: bypasses via role check (service role already bypasses RLS)

-- ============================================================
-- Helper: check if current user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's department_id
CREATE OR REPLACE FUNCTION get_my_department_id()
RETURNS uuid AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's ward_id
CREATE OR REPLACE FUNCTION get_my_ward_id()
RETURNS uuid AS $$
  SELECT ward_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- DEPARTMENTS — all authenticated users can read
-- ============================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by all authenticated users"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- WARDS — all authenticated users can read
-- ============================================================
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wards are viewable by all authenticated users"
  ON wards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage wards"
  ON wards FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- CATEGORIES — all authenticated users can read
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by all authenticated users"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Officials can read profiles in their department/ward
CREATE POLICY "Officials can view profiles in their scope"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_my_role() NOT IN ('citizen')
    AND (
      -- Same department
      department_id = get_my_department_id()
      -- Same ward
      OR ward_id = get_my_ward_id()
      -- Higher-level officials can see all
      OR get_my_role() IN (
        'commissioner','district_collector','chief_secretary','chief_minister','admin'
      )
    )
  );

-- Users can update their own profile (name, phone)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- COMPLAINTS
-- ============================================================
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Citizens can see their own complaints
CREATE POLICY "Citizens can view own complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (citizen_id = auth.uid());

-- Anyone authenticated can see public complaints
CREATE POLICY "Public complaints are viewable by all"
  ON complaints FOR SELECT
  TO authenticated
  USING (visibility = 'public');

-- Officials can see complaints assigned to them
CREATE POLICY "Officials can view assigned complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
  );

-- Officials can see complaints in their department/ward scope
CREATE POLICY "Officials can view complaints in their scope"
  ON complaints FOR SELECT
  TO authenticated
  USING (
    get_my_role() NOT IN ('citizen')
    AND (
      -- Complaint's assigned user is in same department
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = complaints.assigned_to
        AND p.department_id = get_my_department_id()
      )
      -- Or higher-level officials see everything
      OR get_my_role() IN (
        'commissioner','district_collector','chief_secretary','chief_minister'
      )
    )
  );

-- Citizens can insert their own complaints
CREATE POLICY "Citizens can create complaints"
  ON complaints FOR INSERT
  TO authenticated
  WITH CHECK (citizen_id = auth.uid());

-- Citizens can update their own complaints (limited fields handled at app level)
CREATE POLICY "Citizens can update own complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (citizen_id = auth.uid())
  WITH CHECK (citizen_id = auth.uid());

-- Officials can update complaints assigned to them
CREATE POLICY "Officials can update assigned complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR get_my_role() NOT IN ('citizen')
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR get_my_role() NOT IN ('citizen')
  );

-- Admin bypass
CREATE POLICY "Admins can manage all complaints"
  ON complaints FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- COMPLAINT MEDIA (follows complaint access)
-- ============================================================
ALTER TABLE complaint_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media for accessible complaints"
  ON complaint_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_media.complaint_id
      AND (
        c.citizen_id = auth.uid()
        OR c.visibility = 'public'
        OR c.assigned_to = auth.uid()
        OR get_my_role() NOT IN ('citizen')
        OR is_admin()
      )
    )
  );

CREATE POLICY "Citizens can add media to own complaints"
  ON complaint_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_media.complaint_id
      AND c.citizen_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all media"
  ON complaint_media FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- COMPLAINT UPDATES (follows complaint access)
-- ============================================================
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates for accessible complaints"
  ON complaint_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_updates.complaint_id
      AND (
        c.citizen_id = auth.uid()
        OR c.visibility = 'public'
        OR c.assigned_to = auth.uid()
        OR get_my_role() NOT IN ('citizen')
        OR is_admin()
      )
    )
  );

CREATE POLICY "Officials can add updates to assigned complaints"
  ON complaint_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      get_my_role() NOT IN ('citizen')
      OR EXISTS (
        SELECT 1 FROM complaints c
        WHERE c.id = complaint_updates.complaint_id
        AND c.citizen_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all updates"
  ON complaint_updates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- ESCALATION LOGS
-- ============================================================
ALTER TABLE escalation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can view escalation logs for own complaints"
  ON escalation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = escalation_logs.complaint_id
      AND c.citizen_id = auth.uid()
    )
  );

CREATE POLICY "Officials can view escalation logs"
  ON escalation_logs FOR SELECT
  TO authenticated
  USING (
    get_my_role() NOT IN ('citizen')
  );

CREATE POLICY "Admins can manage all escalation logs"
  ON escalation_logs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- FEEDBACK
-- ============================================================
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can view and create feedback for own complaints"
  ON feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = feedback.complaint_id
      AND c.citizen_id = auth.uid()
    )
  );

CREATE POLICY "Citizens can insert feedback for own complaints"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = feedback.complaint_id
      AND c.citizen_id = auth.uid()
    )
  );

CREATE POLICY "Officials can read feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (
    get_my_role() NOT IN ('citizen')
  );

CREATE POLICY "Admins can manage all feedback"
  ON feedback FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
