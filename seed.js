const { Client } = require('pg');
const fs = require('fs');

async function seed() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Pranesh@2010@db.gbaynkdnvxfsxwntqwdv.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/seed.sql', 'utf8');
    await client.query(sql);
    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await client.end();
  }
}

seed();
