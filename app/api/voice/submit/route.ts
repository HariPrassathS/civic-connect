import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/voice/submit
 * Accepts structured complaint data from the voice flow and submits it.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      lat,
      lng,
      address,
      district,
      area,
      issueType,
      title,
      description,
      urgency,
      photoBase64,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    // 1. Find or create a citizen profile by phone number
    let citizenId: string | null = null;

    if (phone) {
      // Try to find existing profile by phone
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .single();

      if (existingProfile) {
        citizenId = existingProfile.id;

        // Update profile with name and location if provided
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: name || undefined,
            district: district || undefined,
            area: area || undefined,
            address: address || undefined,
            lat: lat || undefined,
            lng: lng || undefined,
          })
          .eq("id", citizenId);
      }
    }

    // 2. Map issue type to category ID
    const { data: category } = await supabaseAdmin
      .from("categories")
      .select("id")
      .ilike("name", `%${issueType}%`)
      .limit(1)
      .single();

    const categoryId = category?.id || null;

    // 3. Find the ward based on location (use first ward as fallback)
    let wardId: string | null = null;
    const { data: wards } = await supabaseAdmin
      .from("wards")
      .select("id")
      .limit(1);
    if (wards && wards.length > 0) {
      wardId = wards[0].id;
    }

    // 4. Upload photo if provided
    let photoUrl: string | null = null;
    if (photoBase64) {
      try {
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `voice-complaints/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

        const { data: uploadData, error: uploadError } =
          await supabaseAdmin.storage
            .from("complaint-media")
            .upload(fileName, buffer, {
              contentType: "image/jpeg",
              upsert: false,
            });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabaseAdmin.storage
            .from("complaint-media")
            .getPublicUrl(uploadData.path);
          photoUrl = urlData?.publicUrl || null;
        }
      } catch (e) {
        console.error("Photo upload error:", e);
        // Continue without photo
      }
    }

    // 5. Insert complaint
    const finalDesc = `${description}\n\n[Location: ${area || address || "Unknown"}]\n[Reported via Voice Assistant]`;
    
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from("complaints")
      .insert({
        citizen_id: citizenId,
        category_id: categoryId,
        ward_id: wardId,
        title,
        description: finalDesc,
        lat: lat || null,
        lng: lng || null,
        status: "received",
        urgency: urgency || "medium",
        visibility: "public",
      })
      .select("id")
      .single();

    if (complaintError) {
      console.error("Complaint insert error:", complaintError);
      return NextResponse.json(
        { error: "Failed to submit complaint." },
        { status: 500 }
      );
    }

    // 6. Insert media record if photo was uploaded
    if (photoUrl && complaint) {
      await supabaseAdmin.from("media").insert({
        complaint_id: complaint.id,
        url: photoUrl,
        type: "image",
      });
    }

    return NextResponse.json({
      success: true,
      complaintId: complaint?.id,
    });
  } catch (error: any) {
    console.error("Voice submit error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
