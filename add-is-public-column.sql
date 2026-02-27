-- Add is_public column to events table
-- This allows organizers to set whether events are publicly visible or private

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);

-- Comment on the column
COMMENT ON COLUMN events.is_public IS 'Whether the event is publicly visible to all users (true) or private (false)';
