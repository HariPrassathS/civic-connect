import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:Pranesh%402010@db.vprtecmmurplazpdvjld.supabase.co:5432/postgres'
});
await client.connect();

// Get field worker ID
const fw = await client.query("SELECT id FROM public.profiles WHERE role = 'field_worker' LIMIT 1");
const fwId = fw.rows[0].id;
console.log('Field worker ID:', fwId);

// Get the unassigned complaint
const complaints = await client.query("SELECT id, title, assigned_to FROM public.complaints WHERE assigned_to IS NULL");
console.log('Unassigned complaints:', complaints.rows);

// Assign it
const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
for (const c of complaints.rows) {
  await client.query(
    'UPDATE public.complaints SET assigned_to = $1, status = $2, sla_deadline = $3 WHERE id = $4',
    [fwId, 'assigned', deadline, c.id]
  );
  console.log(`Assigned complaint "${c.title}" to field worker ${fwId}`);
}

await client.end();
console.log('Done!');
