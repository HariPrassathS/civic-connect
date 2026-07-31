import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log("=== 1. CHECK complaint_media TABLE ===");
  const { data: allMedia, error: mediaErr } = await supabase
    .from("complaint_media")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (mediaErr) {
    console.error("Error querying complaint_media:", mediaErr);
  } else {
    console.log(`Found ${allMedia.length} media records:`);
    allMedia.forEach((m, i) => {
      console.log(`  [${i}] id=${m.id}, complaint_id=${m.complaint_id}, type=${m.type}`);
      console.log(`      url=${m.url}`);
    });
  }

  console.log("\n=== 2. CHECK STORAGE BUCKET 'complaint-media' ===");
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error("Error listing buckets:", bucketsErr);
  } else {
    console.log("Available buckets:", buckets.map(b => `${b.name} (public: ${b.public})`));
    const cmBucket = buckets.find(b => b.name === "complaint-media");
    if (!cmBucket) {
      console.error("❌ BUCKET 'complaint-media' NOT FOUND! Media uploads will fail.");
    } else {
      console.log("✅ complaint-media bucket exists, public:", cmBucket.public);
    }
  }

  console.log("\n=== 3. LIST FILES IN STORAGE BUCKET ===");
  const { data: files, error: filesErr } = await supabase.storage
    .from("complaint-media")
    .list("", { limit: 20 });

  if (filesErr) {
    console.error("Error listing storage files:", filesErr);
  } else if (files && files.length > 0) {
    console.log(`Found ${files.length} items in root of complaint-media:`);
    for (const f of files) {
      console.log(`  ${f.name} (${f.id || "folder"})`);
      // If folder, list inside
      if (!f.id && f.name) {
        const { data: inner } = await supabase.storage
          .from("complaint-media")
          .list(f.name, { limit: 10 });
        if (inner) {
          inner.forEach(i => console.log(`    └── ${i.name} (${i.metadata?.size || "?"} bytes)`));
        }
      }
    }
  } else {
    console.log("Storage bucket is EMPTY – no files uploaded yet.");
  }

  console.log("\n=== 4. CHECK COMPLAINTS WITH MEDIA JOIN ===");
  const { data: complaints } = await supabase
    .from("complaints")
    .select(`
      id, title, status,
      media:complaint_media(id, url, type)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  if (complaints) {
    complaints.forEach(c => {
      console.log(`\nComplaint: "${c.title}" (${c.status})`);
      console.log(`  ID: ${c.id}`);
      console.log(`  Media count: ${c.media?.length || 0}`);
      if (c.media) {
        c.media.forEach((m, i) => {
          console.log(`    [${i}] type=${m.type}, url=${m.url}`);
        });
      }
    });
  }

  console.log("\n=== 5. CHECK RLS POLICIES ON complaint_media ===");
  // Try to fetch as the service role, then check if there are any RLS issues
  const { data: rlsCheck, error: rlsErr } = await supabase
    .from("complaint_media")
    .select("id")
    .limit(1);
  
  if (rlsErr) {
    console.error("❌ RLS blocking complaint_media read:", rlsErr);
  } else {
    console.log("✅ Service role can read complaint_media (RLS ok for service role)");
  }

  // Simulate what a field worker would see
  console.log("\n=== 6. CHECK IF URL IS ACCESSIBLE ===");
  if (allMedia && allMedia.length > 0) {
    const testUrl = allMedia[0].url;
    console.log(`Testing URL: ${testUrl}`);
    try {
      const resp = await fetch(testUrl, { method: "HEAD" });
      console.log(`  Status: ${resp.status} ${resp.statusText}`);
      if (resp.status !== 200) {
        console.error("❌ Media URL is NOT accessible! Bucket might not be public.");
      } else {
        console.log("✅ URL is publicly accessible.");
      }
    } catch (e) {
      console.error("❌ Network error fetching URL:", e.message);
    }
  }
}

diagnose();
