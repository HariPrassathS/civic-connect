import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(url, key);

async function check() {
  const { data: comp } = await supabase.from('complaints').select('*').eq('id', 'e25baa2a-a02b-436a-be97-a9c319aa8a49').single();
  console.log('Complaint:', comp);
  
  const { data: updates } = await supabase.from('complaint_updates').select('*').eq('complaint_id', 'e25baa2a-a02b-436a-be97-a9c319aa8a49');
  console.log('Updates:', updates);
}
check();
