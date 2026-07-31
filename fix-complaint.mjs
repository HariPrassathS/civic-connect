import { createClient } from '@supabase/supabase-js';
import fs from 'fs';


const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(url, key);

async function run() {
  // Let's just manually update it to assigned for this worker
  // since ts-node might not be set up
  
  // Get field workers
  const { data: workers } = await supabase.from('profiles').select('*').eq('role', 'field_worker');
  const worker = workers[0];
  console.log('Assigning to', worker.full_name);
  
  await supabase.from('complaints').update({
    status: 'assigned',
    assigned_to: worker.id,
    priority: 'high',
    escalation_level: 1,
    ai_summary: ['Priority: high (manually fixed)', 'Assigned to first available worker']
  }).eq('id', 'e25baa2a-a02b-436a-be97-a9c319aa8a49');
  
  console.log('Fixed');
}
run();
