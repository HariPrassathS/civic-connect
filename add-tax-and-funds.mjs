import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function seedTaxCategories() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("Connecting to Supabase to seed Tax categories...");
  
  // Insert root Tax category
  const { data: existingTax } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Tax & Revenue")
    .maybeSingle();

  let parentId;
  if (!existingTax) {
    const { data: taxCat, error: taxErr } = await supabase
      .from("categories")
      .insert({ name: "Tax & Revenue", parent_id: null })
      .select("id")
      .single();

    if (taxErr) {
      console.error("Error inserting Tax category:", taxErr);
      return;
    }
    parentId = taxCat.id;
    console.log("✅ Created 'Tax & Revenue' root category.");
  } else {
    parentId = existingTax.id;
    console.log("✅ 'Tax & Revenue' category already exists.");
  }

  // Insert subcategories
  const subcats = [
    { name: "Road Tax", parent_id: parentId },
    { name: "House & Property Tax", parent_id: parentId },
    { name: "Income & Commercial Tax", parent_id: parentId },
    { name: "General Revenue Query", parent_id: parentId }
  ];

  for (const sub of subcats) {
    const { data: exists } = await supabase
      .from("categories")
      .select("id")
      .eq("name", sub.name)
      .eq("parent_id", parentId)
      .maybeSingle();

    if (!exists) {
      await supabase.from("categories").insert(sub);
      console.log(`  + Inserted subcategory: ${sub.name}`);
    } else {
      console.log(`  • Subcategory already present: ${sub.name}`);
    }
  }
}

seedTaxCategories();
