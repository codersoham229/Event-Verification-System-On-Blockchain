-- Add event_type column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'other';

-- Add event_type column to enrollment_requests table
ALTER TABLE enrollment_requests ADD COLUMN IF NOT EXISTS event_type TEXT;
