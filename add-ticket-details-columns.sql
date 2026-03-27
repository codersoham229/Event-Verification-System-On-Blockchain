-- Add enriched event details + photo info to ticket_emails
-- So user tickets show full event information and the enrollment photo

ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS event_location TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS event_description TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS attendee_name TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS photo_encryption_key TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS photo_encryption_iv TEXT;

-- Add 'invited' as a valid status for private event invitations
-- (enrollment_requests.status can now be: pending, approved, declined, invited)
