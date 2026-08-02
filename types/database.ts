// TypeScript types matching the Supabase database schema from PROJECT.md §4

// ─── Enums ────────────────────────────────────────────────────

export type UserRole =
  | "citizen"
  | "field_worker"
  | "area_officer"
  | "department_head"
  | "commissioner"
  | "district_collector"
  | "chief_secretary"
  | "chief_minister"
  | "admin";

export type ComplaintStatus =
  | "received"
  | "ai_processing"
  | "assigned"
  | "in_progress"
  | "resolution_submitted"
  | "verified"
  | "closed"
  | "escalated";

export type Priority = "low" | "medium" | "high" | "urgent";

export type Visibility = "public" | "private";

export type NotificationChannel = "in_app" | "email" | "sms" | "push";

// ─── Table Row Types ──────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  department_id: string | null;
  ward_id: string | null;
  fcm_token: string | null;
  address: string | null;
  district: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
}

export interface Ward {
  id: string;
  name: string;
  area_officer_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Complaint {
  id: string;
  citizen_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  visibility: Visibility;
  status: ComplaintStatus;
  priority: Priority | null;
  assigned_to: string | null;
  escalation_level: number;
  sla_deadline: string | null;
  duplicate_of: string | null;
  sentiment: "positive" | "neutral" | "negative" | "angry" | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintMedia {
  id: string;
  complaint_id: string;
  url: string;
  type: string | null;
  created_at: string;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  actor_id: string | null;
  note: string | null;
  status_from: string | null;
  status_to: string | null;
  created_at: string;
}

export interface EscalationLog {
  id: string;
  complaint_id: string;
  from_level: number;
  to_level: number;
  reason: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  complaint_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  channel: NotificationChannel;
  read: boolean;
  created_at: string;
}

export interface ComplaintUpvote {
  id: string;
  complaint_id: string;
  user_id: string;
  created_at: string;
}

export interface WorkLog {
  id: string;
  complaint_id: string;
  worker_id: string;
  hours: number;
  note: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  complaint_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Composite type for queries joining complaint with related data
export interface ComplaintWithDetails extends Complaint {
  category?: Category | null;
  media?: ComplaintMedia[];
  updates?: ComplaintUpdate[];
  upvote_count?: number;
  user_has_upvoted?: boolean;
}

// ─── Role → Dashboard URL mapping ────────────────────────────

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  citizen: "/dashboard/citizen",
  field_worker: "/dashboard/field-worker",
  area_officer: "/dashboard/area-officer",
  department_head: "/dashboard/department-head",
  commissioner: "/dashboard/commissioner",
  district_collector: "/dashboard/district-collector",
  chief_secretary: "/dashboard/chief-secretary",
  chief_minister: "/dashboard/chief-minister",
  admin: "/admin",
};

// DB role slug → URL slug (underscores → hyphens)
export function roleToSlug(role: UserRole): string {
  if (role === "admin") return "admin";
  return role.replace(/_/g, "-");
}

// URL slug → DB role (hyphens → underscores)
export function slugToRole(slug: string): UserRole | null {
  if (slug === "admin") return "admin";
  const role = slug.replace(/-/g, "_") as UserRole;
  const validRoles: UserRole[] = [
    "citizen",
    "field_worker",
    "area_officer",
    "department_head",
    "commissioner",
    "district_collector",
    "chief_secretary",
    "chief_minister",
    "admin",
  ];
  return validRoles.includes(role) ? role : null;
}
