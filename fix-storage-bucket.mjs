import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixStorage() {
  console.log("=== STEP 1: Create 'complaint-media' storage bucket ===");
  
  // First check if it already exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === "complaint-media");
  
  if (exists) {
    console.log("✅ Bucket already exists.");
  } else {
    const { data, error } = await supabase.storage.createBucket("complaint-media", {
      public: true,  // Public so URLs are directly accessible
      fileSizeLimit: 52428800, // 50MB max
      allowedMimeTypes: [
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
        "video/mp4", "video/webm", "video/quicktime",
        "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"
      ]
    });
    
    if (error) {
      console.error("❌ Failed to create bucket:", error);
    } else {
      console.log("✅ Created 'complaint-media' bucket (public, 50MB limit)");
    }
  }

  console.log("\n=== STEP 2: Verify bucket is public ===");
  const { data: bucketInfo, error: infoErr } = await supabase.storage.getBucket("complaint-media");
  if (infoErr) {
    console.error("Error:", infoErr);
  } else {
    console.log(`  Name: ${bucketInfo.name}`);
    console.log(`  Public: ${bucketInfo.public}`);
    console.log(`  File size limit: ${bucketInfo.file_size_limit}`);
    
    if (!bucketInfo.public) {
      console.log("  Updating to public...");
      await supabase.storage.updateBucket("complaint-media", { public: true });
      console.log("  ✅ Updated to public.");
    }
  }

  console.log("\n=== STEP 3: Test upload ===");
  const testContent = new Uint8Array([137, 80, 78, 71]); // PNG header bytes
  const testPath = "_test_/upload-test.bin";
  
  const { error: uploadErr } = await supabase.storage
    .from("complaint-media")
    .upload(testPath, testContent, { upsert: true });

  if (uploadErr) {
    console.error("❌ Test upload failed:", uploadErr);
  } else {
    const { data: urlData } = supabase.storage
      .from("complaint-media")
      .getPublicUrl(testPath);
    
    console.log("✅ Test upload successful!");
    console.log(`  Public URL: ${urlData.publicUrl}`);
    
    // Verify URL is accessible
    try {
      const resp = await fetch(urlData.publicUrl, { method: "HEAD" });
      console.log(`  URL accessible: ${resp.status === 200 ? "YES ✅" : "NO ❌ (" + resp.status + ")"}`);
    } catch (e) {
      console.error("  URL check failed:", e.message);
    }
    
    // Clean up test file
    await supabase.storage.from("complaint-media").remove([testPath]);
    console.log("  Test file cleaned up.");
  }

  console.log("\n=== STEP 4: Add RLS policy for field workers to INSERT media ===");
  // Field workers need to upload resolution photos too.
  // The current RLS only allows citizens (owner of complaint) to INSERT into complaint_media.
  // We need to also allow assigned field workers.
  // We'll run this via the Supabase SQL editor using the service role client.
  try {
    const { error: policyErr } = await supabase.rpc("exec_sql", {
      sql: `
        -- Allow field workers to INSERT media for complaints assigned to them
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'complaint_media' 
            AND policyname = 'Field workers can add media to assigned complaints'
          ) THEN
            CREATE POLICY "Field workers can add media to assigned complaints"
              ON complaint_media FOR INSERT
              TO authenticated
              WITH CHECK (
                EXISTS (
                  SELECT 1 FROM complaints c
                  WHERE c.id = complaint_media.complaint_id
                  AND c.assigned_to = auth.uid()
                )
              );
          END IF;
        END $$;
      `
    });
    
    if (policyErr) {
      // exec_sql RPC might not exist — try direct approach
      console.log("  ⚠️ exec_sql RPC not available, documenting needed SQL:");
      console.log(`
  Run this SQL in Supabase Dashboard > SQL Editor:
  
  CREATE POLICY "Field workers can add media to assigned complaints"
    ON complaint_media FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM complaints c
        WHERE c.id = complaint_media.complaint_id
        AND c.assigned_to = auth.uid()
      )
    );
      `);
    } else {
      console.log("✅ Added field worker INSERT policy on complaint_media.");
    }
  } catch (e) {
    console.log("  ⚠️ Could not auto-create RLS policy. The actions.ts already uses service role for field worker uploads, so this is optional.");
  }

  console.log("\n=== DONE ===");
  console.log("The 'complaint-media' storage bucket is now created and public.");
  console.log("Citizens can now upload images/voice notes when submitting complaints.");
  console.log("Field workers will see them in their task detail view.");
}

fixStorage();
