-- Seed script for Civic Connect
-- Run via: supabase db reset (applies migrations + seed)
-- Or paste into Supabase SQL Editor with service role
--
-- Creates: 3 departments, 3 wards, 10 categories with subcategories,
--          9 demo users (one per role)

-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================
INSERT INTO departments (id, name, city) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Water Supply (CMWSSB)', 'Chennai'),
  ('d1000000-0000-0000-0000-000000000002', 'Road Maintenance', 'Chennai'),
  ('d1000000-0000-0000-0000-000000000003', 'Sanitation (GCC)', 'Chennai');

-- ============================================================
-- 2. DEMO USERS (inserted into auth.users, trigger creates profiles)
-- All passwords: "Password123!"
-- ============================================================

-- Helper: We use supabase_auth_admin to insert users.
-- The handle_new_user trigger will auto-create profile rows with role='citizen'.
-- We then UPDATE profiles to set the correct role, department, and ward.

-- Citizen
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'citizen@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Rajesh Kumar", "phone": "+919876543210"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Field Worker
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'fieldworker@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Suresh Maintenance", "phone": "+919876543211"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Area Officer
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'areaofficer@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Priya Inspector", "phone": "+919876543212"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Department Head
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'depthead@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Anand Director", "phone": "+919876543213"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Commissioner
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'commissioner@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Meera Commissioner", "phone": "+919876543214"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- District Collector
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'collector@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Vikram Collector", "phone": "+919876543215"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Chief Secretary
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'chiefsecretary@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Lakshmi Secretary", "phone": "+919876543216"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Chief Minister
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000000',
  'chiefminister@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "Honorable CM", "phone": "+919876543217"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Admin
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'admin@civicconnect.demo',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"full_name": "System Admin", "phone": "+919876543218"}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);

-- Also insert identities for each user (required for email/password login)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"citizen@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000001', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', '{"sub":"a0000000-0000-0000-0000-000000000002","email":"fieldworker@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000002', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', '{"sub":"a0000000-0000-0000-0000-000000000003","email":"areaofficer@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000003', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', '{"sub":"a0000000-0000-0000-0000-000000000004","email":"depthead@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000004', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', '{"sub":"a0000000-0000-0000-0000-000000000005","email":"commissioner@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000005', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', '{"sub":"a0000000-0000-0000-0000-000000000006","email":"collector@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000006', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', '{"sub":"a0000000-0000-0000-0000-000000000007","email":"chiefsecretary@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000007', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', '{"sub":"a0000000-0000-0000-0000-000000000008","email":"chiefminister@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000008', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000009', '{"sub":"a0000000-0000-0000-0000-000000000009","email":"admin@civicconnect.demo"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000009', now(), now(), now());

-- ============================================================
-- 3. UPDATE PROFILES with correct roles + department/ward assignments
--    (trigger created them all as 'citizen')
-- ============================================================
-- citizen stays as citizen
UPDATE profiles SET
  role = 'citizen'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

UPDATE profiles SET
  role = 'field_worker',
  department_id = 'd1000000-0000-0000-0000-000000000001'
WHERE id = 'a0000000-0000-0000-0000-000000000002';

UPDATE profiles SET
  role = 'area_officer',
  department_id = 'd1000000-0000-0000-0000-000000000002'
WHERE id = 'a0000000-0000-0000-0000-000000000003';

UPDATE profiles SET
  role = 'department_head',
  department_id = 'd1000000-0000-0000-0000-000000000001'
WHERE id = 'a0000000-0000-0000-0000-000000000004';

UPDATE profiles SET
  role = 'commissioner',
  department_id = 'd1000000-0000-0000-0000-000000000002'
WHERE id = 'a0000000-0000-0000-0000-000000000005';

UPDATE profiles SET
  role = 'district_collector'
WHERE id = 'a0000000-0000-0000-0000-000000000006';

UPDATE profiles SET
  role = 'chief_secretary'
WHERE id = 'a0000000-0000-0000-0000-000000000007';

UPDATE profiles SET
  role = 'chief_minister'
WHERE id = 'a0000000-0000-0000-0000-000000000008';

UPDATE profiles SET
  role = 'admin'
WHERE id = 'a0000000-0000-0000-0000-000000000009';

-- ============================================================
-- 4. WARDS (created after profiles so we can reference area_officer)
-- ============================================================
INSERT INTO wards (id, name, area_officer_id) VALUES
  ('11000000-0000-0000-0000-000000000001', 'Zone 1 - Thiruvottiyur',   'a0000000-0000-0000-0000-000000000003'),
  ('11000000-0000-0000-0000-000000000002', 'Zone 2 - Manali',      NULL),
  ('11000000-0000-0000-0000-000000000003', 'Zone 9 - Teynampet',      NULL);

-- Assign wards to field worker and area officer
UPDATE profiles SET ward_id = '11000000-0000-0000-0000-000000000001'
WHERE id = 'a0000000-0000-0000-0000-000000000002';

UPDATE profiles SET ward_id = '11000000-0000-0000-0000-000000000001'
WHERE id = 'a0000000-0000-0000-0000-000000000003';

-- ============================================================
-- 5. CATEGORIES (10 parent categories with subcategories)
-- ============================================================

-- Water Supply
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Water Supply', NULL),
  ('c1000000-0000-0000-0000-000000000011', 'Water Leak',           'c1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000012', 'No Water Supply',      'c1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000013', 'Water Contamination',  'c1000000-0000-0000-0000-000000000001');

-- Roads & Potholes
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000002', 'Roads & Potholes', NULL),
  ('c1000000-0000-0000-0000-000000000021', 'Pothole',               'c1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000022', 'Road Flooding',         'c1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000023', 'Road Damage',           'c1000000-0000-0000-0000-000000000002');

-- Sanitation & Garbage
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000003', 'Sanitation & Garbage', NULL),
  ('c1000000-0000-0000-0000-000000000031', 'Garbage Not Collected', 'c1000000-0000-0000-0000-000000000003'),
  ('c1000000-0000-0000-0000-000000000032', 'Open Dumping',          'c1000000-0000-0000-0000-000000000003'),
  ('c1000000-0000-0000-0000-000000000033', 'Drain Blockage',        'c1000000-0000-0000-0000-000000000003');

-- Streetlights
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000004', 'Streetlights', NULL),
  ('c1000000-0000-0000-0000-000000000041', 'Light Not Working',    'c1000000-0000-0000-0000-000000000004'),
  ('c1000000-0000-0000-0000-000000000042', 'New Light Request',    'c1000000-0000-0000-0000-000000000004');

-- Electricity
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000005', 'Electricity', NULL),
  ('c1000000-0000-0000-0000-000000000051', 'Power Outage',        'c1000000-0000-0000-0000-000000000005'),
  ('c1000000-0000-0000-0000-000000000052', 'Voltage Fluctuation',  'c1000000-0000-0000-0000-000000000005'),
  ('c1000000-0000-0000-0000-000000000053', 'Electricity Theft',    'c1000000-0000-0000-0000-000000000005');

-- Parks & Public Spaces
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000006', 'Parks & Public Spaces', NULL),
  ('c1000000-0000-0000-0000-000000000061', 'Park Maintenance',     'c1000000-0000-0000-0000-000000000006'),
  ('c1000000-0000-0000-0000-000000000062', 'Encroachment',         'c1000000-0000-0000-0000-000000000006');

-- Traffic & Transport
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000007', 'Traffic & Transport', NULL),
  ('c1000000-0000-0000-0000-000000000071', 'Traffic Signal Issue',  'c1000000-0000-0000-0000-000000000007'),
  ('c1000000-0000-0000-0000-000000000072', 'Illegal Parking',      'c1000000-0000-0000-0000-000000000007');

-- Building & Construction
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000008', 'Building & Construction', NULL),
  ('c1000000-0000-0000-0000-000000000081', 'Illegal Construction',  'c1000000-0000-0000-0000-000000000008'),
  ('c1000000-0000-0000-0000-000000000082', 'Dangerous Structure',   'c1000000-0000-0000-0000-000000000008');

-- Environment & Pollution
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000009', 'Environment & Pollution', NULL),
  ('c1000000-0000-0000-0000-000000000091', 'Air Pollution',         'c1000000-0000-0000-0000-000000000009'),
  ('c1000000-0000-0000-0000-000000000092', 'Noise Pollution',       'c1000000-0000-0000-0000-000000000009');

-- Other / Miscellaneous
INSERT INTO categories (id, name, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000010', 'Other', NULL),
  ('c1000000-0000-0000-0000-000000000101', 'General Complaint',    'c1000000-0000-0000-0000-000000000010'),
  ('c1000000-0000-0000-0000-000000000102', 'Suggestion',           'c1000000-0000-0000-0000-000000000010');
