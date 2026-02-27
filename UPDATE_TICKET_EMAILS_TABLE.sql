-- UPDATE SCRIPT FOR ticket_emails TABLE
-- Run this in your Supabase SQL Editor to fix the schema

-- Step 1: Drop the existing table if you want to start fresh (WARNING: This deletes all data!)
-- Uncomment the line below only if you want to delete existing tickets
-- DROP TABLE IF EXISTS ticket_emails CASCADE;

-- Step 2: Create the table with the correct schema
CREATE TABLE IF NOT EXISTS ticket_emails (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  ticket_id VARCHAR(255) NOT NULL UNIQUE,
  unique_hash TEXT,
  qr_data TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_emails_recipient ON ticket_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_ticket_emails_event ON ticket_emails(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_emails_ticket_id ON ticket_emails(ticket_id);

-- Step 4: If you have an existing table and want to modify it instead of dropping it,
-- use these ALTER TABLE commands (uncomment the ones you need):

-- Remove columns that are no longer needed:
-- ALTER TABLE ticket_emails DROP COLUMN IF EXISTS sent_at;
-- ALTER TABLE ticket_emails DROP COLUMN IF EXISTS ticket_owner;
-- ALTER TABLE ticket_emails DROP COLUMN IF EXISTS attendee_name;
-- ALTER TABLE ticket_emails DROP COLUMN IF EXISTS transaction_hash;

-- Add missing columns if they don't exist:
-- ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS event_id INTEGER NOT NULL;
-- ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255) NOT NULL;
-- ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS unique_hash TEXT;
-- ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS qr_data TEXT;
-- ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'sent';
-- ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Modify ticket_id to be VARCHAR and UNIQUE if it isn't already:
-- ALTER TABLE ticket_emails ALTER COLUMN ticket_id TYPE VARCHAR(255);
-- ALTER TABLE ticket_emails ADD CONSTRAINT ticket_id_unique UNIQUE (ticket_id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ticket_emails' 
ORDER BY ordinal_position;
