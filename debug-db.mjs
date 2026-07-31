import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Pranesh%402010@db.vprtecmmurplazpdvjld.supabase.co:5432/postgres'
});

await client.connect();

// 1. List all public tables
const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
console.log('=== PUBLIC TABLES ===');
console.log(tables.rows.map(r => r.table_name));

// 2. Check profiles
const profiles = await client.query('SELECT * FROM public.profiles ORDER BY role');
console.log('\n=== PROFILES ===');
console.log(JSON.stringify(profiles.rows, null, 2));

// 3. Check auth users
const users = await client.query('SELECT id, email FROM auth.users ORDER BY email');
console.log('\n=== AUTH USERS ===');
console.log(JSON.stringify(users.rows, null, 2));

// 4. Check complaints
const complaints = await client.query('SELECT id, title, status, priority, category_id, assigned_to FROM public.complaints LIMIT 10');
console.log('\n=== COMPLAINTS ===');
console.log(JSON.stringify(complaints.rows, null, 2));

// 5. Check categories
const categories = await client.query('SELECT id, name, parent_id FROM public.categories ORDER BY name LIMIT 30');
console.log('\n=== CATEGORIES ===');
console.log(JSON.stringify(categories.rows, null, 2));

// 6. Check departments
const depts = await client.query('SELECT * FROM public.departments ORDER BY name LIMIT 20');
console.log('\n=== DEPARTMENTS ===');
console.log(JSON.stringify(depts.rows, null, 2));

// 7. Check wards
const wards = await client.query('SELECT * FROM public.wards LIMIT 10');
console.log('\n=== WARDS ===');
console.log(JSON.stringify(wards.rows, null, 2));

// 8. Check profile columns
const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position`);
console.log('\n=== PROFILES COLUMNS ===');
console.log(cols.rows);

// 9. Check complaint columns
const ccols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='complaints' ORDER BY ordinal_position`);
console.log('\n=== COMPLAINTS COLUMNS ===');
console.log(ccols.rows);

await client.end();
