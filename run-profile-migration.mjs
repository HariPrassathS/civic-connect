import pg from "pg";
const { Client } = pg;

const connectionString = "postgresql://postgres:Pranesh@2010@db.vprtecmmurplazpdvjld.supabase.co:5432/postgres";

const sql = `
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state text DEFAULT 'Tamil Nadu';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lng double precision;

CREATE TABLE IF NOT EXISTS public.telegram_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    otp text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telegram_otps_phone ON public.telegram_otps(phone);
ALTER TABLE public.telegram_otps ENABLE ROW LEVEL SECURITY;
`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Supabase DB ✅");
    
    await client.query(sql);
    console.log("Migration complete ✅ - All profile columns added!");
    
    // Verify columns
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      ORDER BY ordinal_position
    `);
    console.log("\nProfiles table columns:");
    result.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
