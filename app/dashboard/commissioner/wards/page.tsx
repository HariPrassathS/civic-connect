import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CommissionerWardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all wards and their officers
  const { data: wards } = await supabase
    .from("wards")
    .select(`
      id, 
      name,
      zone:zones(name),
      officers:profiles!profiles_ward_id_fkey(id, full_name, role)
    `);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Wards & Officers</h2>
        <p className="text-muted-foreground">
          View all wards and assigned officials across the city.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {wards?.map((ward: any) => (
          <div key={ward.id} className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-lg">{ward.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">Zone: {ward.zone?.name || "Unknown"}</p>
            
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Personnel</h4>
              {ward.officers?.length === 0 ? (
                <div className="text-sm italic text-muted-foreground">No personnel assigned</div>
              ) : (
                ward.officers?.map((officer: any) => (
                  <div key={officer.id} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                    <span>{officer.full_name}</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{officer.role.replace("_", " ")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
