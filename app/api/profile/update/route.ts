import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const {
      full_name,
      phone,
      address,
      district,
      area,
      city,
      state,
      pincode,
      lat,
      lng,
      avatar_url,
    } = body;

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        phone,
        address,
        district,
        area,
        city,
        state,
        pincode,
        lat,
        lng,
        ...(avatar_url !== undefined ? { avatar_url } : {}),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
