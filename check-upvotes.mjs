import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('complaint_upvotes').select('id').limit(1);
  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log("Table exists! Rows:", data);
  }
}
check();
