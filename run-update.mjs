import pg from "pg";

const { Client } = pg;

async function runUpdate() {
  const connectionString = "postgresql://postgres:Pranesh@2010@db.gbaynkdnvxfsxwntqwdv.supabase.co:5432/postgres";
  
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    await client.query(`
      UPDATE departments SET name = 'Water Supply (CMWSSB)', city = 'Chennai' WHERE id = 'd1000000-0000-0000-0000-000000000001';
      UPDATE departments SET name = 'Road Maintenance', city = 'Chennai' WHERE id = 'd1000000-0000-0000-0000-000000000002';
      UPDATE departments SET name = 'Sanitation (GCC)', city = 'Chennai' WHERE id = 'd1000000-0000-0000-0000-000000000003';
      
      UPDATE wards SET name = 'Zone 1 - Thiruvottiyur' WHERE id = '11000000-0000-0000-0000-000000000001';
      UPDATE wards SET name = 'Zone 2 - Manali' WHERE id = '11000000-0000-0000-0000-000000000002';
      UPDATE wards SET name = 'Zone 9 - Teynampet' WHERE id = '11000000-0000-0000-0000-000000000003';
    `);
    
    console.log("Update script executed successfully.");
  } catch (err) {
    console.error("Error executing update script:", err);
  } finally {
    await client.end();
  }
}

runUpdate();
