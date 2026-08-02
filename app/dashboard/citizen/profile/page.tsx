import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and location
        </p>
      </div>
      <ProfileForm
        profile={profile}
        userEmail={user.email || ""}
        userAvatar={user.user_metadata?.avatar_url || ""}
      />
    </div>
  );
}
