/**
 * Escalation SLA rules per PROJECT.md §5.
 * Level → Role → SLA window.
 * 
 * Reads from the `settings` table when available (set via Admin Console).
 * Falls back to hardcoded defaults if the DB query fails.
 */

import type { UserRole } from "@/types/database";

export interface EscalationLevel {
  level: number;
  role: UserRole;
  label: string;
  slaHours: number | null; // null = manual / no auto SLA
}

/** Hardcoded defaults — used as fallback if settings table is unavailable */
export const ESCALATION_LEVELS: EscalationLevel[] = [
  { level: 1, role: "field_worker", label: "Field Worker / Maintenance Team", slaHours: 24 },
  { level: 2, role: "area_officer", label: "Zonal Officer (Area Officer)", slaHours: 24 },
  { level: 3, role: "department_head", label: "Department Head", slaHours: 48 },
  { level: 4, role: "commissioner", label: "Regional Deputy Commissioner", slaHours: 72 },
  { level: 5, role: "commissioner", label: "GCC / Municipal Commissioner", slaHours: null },
  { level: 6, role: "district_collector", label: "District Collector", slaHours: null },
  { level: 7, role: "chief_secretary", label: "Chief Secretary (Tamil Nadu)", slaHours: null },
  { level: 8, role: "chief_minister", label: "Chief Minister (Tamil Nadu)", slaHours: null },
];

/**
 * Fetch SLA hours from the `settings` table.
 * Returns the DB value if found, otherwise falls back to the hardcoded default.
 * Used by the escalation engine (API routes / cron jobs).
 */
export async function getSLAHoursForLevel(
  level: number,
  supabaseClient?: any
): Promise<number | null> {
  const config = ESCALATION_LEVELS.find((l) => l.level === level);
  if (!config) return null;

  // If no supabase client provided, use hardcoded defaults
  if (!supabaseClient) return config.slaHours;

  try {
    const { data } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", `sla_hours_level_${level}`)
      .single();

    if (data?.value !== undefined && data.value !== null) {
      return typeof data.value === "number" ? data.value : null;
    }
  } catch {
    // Settings table might not exist yet — fall through to default
  }

  return config.slaHours;
}

/**
 * Calculate the SLA deadline for a given escalation level.
 * Returns null for levels without auto-SLA.
 */
export function calculateSLADeadline(
  level: number,
  fromDate: Date = new Date()
): Date | null {
  const config = ESCALATION_LEVELS.find((l) => l.level === level);
  if (!config || config.slaHours === null) return null;

  const deadline = new Date(fromDate);
  deadline.setHours(deadline.getHours() + config.slaHours);
  return deadline;
}

/**
 * Async version that reads from DB settings.
 */
export async function calculateSLADeadlineFromDB(
  level: number,
  supabaseClient: any,
  fromDate: Date = new Date()
): Promise<Date | null> {
  const slaHours = await getSLAHoursForLevel(level, supabaseClient);
  if (slaHours === null) return null;

  const deadline = new Date(fromDate);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

/**
 * Get the role for a given escalation level.
 */
export function getRoleForLevel(level: number): UserRole | null {
  const config = ESCALATION_LEVELS.find((l) => l.level === level);
  return config?.role ?? null;
}

/**
 * Get the next escalation level (capped at 8).
 */
export function getNextLevel(currentLevel: number): number {
  return Math.min(currentLevel + 1, 8);
}
