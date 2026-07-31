import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(url, key);

async function run() {
  const sql = `
    -- Add upvotes_count to complaints if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='upvotes_count') THEN
        ALTER TABLE complaints ADD COLUMN upvotes_count INTEGER DEFAULT 0;
      END IF;
    END
    $$;

    -- Create complaint_upvotes table
    CREATE TABLE IF NOT EXISTS complaint_upvotes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      citizen_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(complaint_id, citizen_id)
    );

    -- Enable RLS
    ALTER TABLE complaint_upvotes ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist to avoid errors
    DROP POLICY IF EXISTS "Anyone can view upvotes" ON complaint_upvotes;
    DROP POLICY IF EXISTS "Citizens can upvote" ON complaint_upvotes;
    DROP POLICY IF EXISTS "Citizens can remove their upvote" ON complaint_upvotes;

    -- RLS Policies
    CREATE POLICY "Anyone can view upvotes" ON complaint_upvotes FOR SELECT USING (true);
    CREATE POLICY "Citizens can upvote" ON complaint_upvotes FOR INSERT WITH CHECK (auth.uid() = citizen_id);
    CREATE POLICY "Citizens can remove their upvote" ON complaint_upvotes FOR DELETE USING (auth.uid() = citizen_id);

    -- Create trigger function to update upvotes_count
    CREATE OR REPLACE FUNCTION update_complaint_upvotes_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE complaints SET upvotes_count = upvotes_count + 1 WHERE id = NEW.complaint_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE complaints SET upvotes_count = GREATEST(0, upvotes_count - 1) WHERE id = OLD.complaint_id;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS trigger_update_upvotes_count ON complaint_upvotes;

    -- Create trigger
    CREATE TRIGGER trigger_update_upvotes_count
    AFTER INSERT OR DELETE ON complaint_upvotes
    FOR EACH ROW EXECUTE FUNCTION update_complaint_upvotes_count();
  `;

  // Workaround: Supabase JS client doesn't support raw SQL execution directly on the public schema easily unless via an RPC function.
  // Wait, if it doesn't, we might need an RPC function. But we can't create an RPC without running SQL!
  // I will write this to a file and run it via a psql command, or create a migration and push.
  console.log("SQL script written to schema_update.sql");
}
run();
