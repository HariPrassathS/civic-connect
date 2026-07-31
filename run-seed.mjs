import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;

async function runSeed() {
  const connectionString = "postgresql://postgres:Pranesh@2010@db.vprtecmmurplazpdvjld.supabase.co:5432/postgres";
  
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    const seedPath = path.join(process.cwd(), "supabase", "seed.sql");
    const sql = fs.readFileSync(seedPath, "utf8");
    
    console.log("Running seed script...");
    await client.query(sql);
    
    console.log("Seed script executed successfully.");
  } catch (err) {
    console.error("Error executing seed script:", err);
  } finally {
    await client.end();
  }
}

runSeed();
