import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:Pranesh%402010@db.vprtecmmurplazpdvjld.supabase.co:5432/postgres'
});

await client.connect();

// Check RLS policies on profiles
const r1 = await client.query("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles'");
console.log('=== PROFILES POLICIES ===');
console.log(JSON.stringify(r1.rows, null, 2));

// Check RLS policies on complaints
const r2 = await client.query("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'complaints'");
console.log('\n=== COMPLAINTS POLICIES ===');
console.log(JSON.stringify(r2.rows, null, 2));

// Check if RLS is enabled on profiles
const r3 = await client.query("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('profiles', 'complaints', 'categories', 'wards', 'departments')");
console.log('\n=== RLS ENABLED? ===');
console.log(JSON.stringify(r3.rows, null, 2));

await client.end();
