-- Add upvotes_count to complaints if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='upvotes_count') THEN
    ALTER TABLE complaints ADD COLUMN upvotes_count INTEGER DEFAULT 0;
  END IF;
END
$$;

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
