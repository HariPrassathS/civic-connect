import pg from "pg";
import fs from "fs";

const migrationSQL = fs.readFileSync("supabase/migrations/00006_predictive_alerts.sql", "utf-8");

// Try different Supabase connection formats
const connectionOptions = [
  `postgresql://postgres:Pranesh%402010@db.vprtecmmurplazpdvjld.supabase.co:5432/postgres`,
  `postgresql://postgres.vprtecmmurplazpdvjld:Pranesh%402010@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:Pranesh%402010@db.vprtecmmurplazpdvjld.supabase.co:6543/postgres`,
];

async function run() {
  for (const dbUrl of connectionOptions) {
    console.log(`\n🔗 Trying: ${dbUrl.substring(0, 40)}...`);
    const client = new pg.Client({ 
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    try {
      await client.connect();
      console.log("✅ Connected!");
      
      const statements = migrationSQL.split(";").filter(s => s.trim().length > 0);
      for (const stmt of statements) {
        try {
          await client.query(stmt + ";");
          console.log("✅ Executed:", stmt.trim().substring(0, 60) + "...");
        } catch (err) {
          if (err.message.includes("already exists")) {
            console.log("⏭️  Already exists, skipping.");
          } else {
            console.error("❌ Query Error:", err.message);
          }
        }
      }
      
      console.log("\n🎉 Migration complete!");
      await client.end();
      return; // Success - stop trying
    } catch (err) {
      console.log("❌ Failed:", err.message);
      try { await client.end(); } catch {}
    }
  }
  console.log("\n❌ All connection methods failed.");
}

run();
