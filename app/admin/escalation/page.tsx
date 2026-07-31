import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EscalationConfig } from "./escalation-config";
import { ESCALATION_LEVELS } from "@/lib/escalation/rules";

export default async function AdminEscalationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") redirect("/login");

  // Fetch saved SLA settings from DB (if the table exists)
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value, description")
    .like("key", "sla_hours_level_%")
    .order("key");

  // Merge DB settings with defaults
  const levels = ESCALATION_LEVELS.map((level) => {
    const settingKey = `sla_hours_level_${level.level}`;
    const dbSetting = settings?.find((s) => s.key === settingKey);
    const dbValue = dbSetting?.value;
    const slaHours =
      dbValue !== undefined && dbValue !== null
        ? typeof dbValue === "number"
          ? dbValue
          : null
        : level.slaHours;

    return {
      ...level,
      slaHours,
      settingKey,
      description: dbSetting?.description || "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Escalation Rules
        </h2>
        <p className="text-muted-foreground">
          Configure SLA hours per escalation level. Changes take effect
          immediately for the escalation engine.
        </p>
      </div>

      <EscalationConfig levels={levels} />
    </div>
  );
}
