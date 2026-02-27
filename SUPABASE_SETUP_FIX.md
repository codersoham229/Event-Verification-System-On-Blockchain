# Fix Supabase Database Error (400) for Ticket Emails

## Problem
You're getting a 400 error when trying to generate tickets because the `ticket_emails` table in your Supabase database doesn't match the schema expected by the application.

## Solution

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Update the Database Schema

**Option A: Start Fresh (Recommended if you have no important data)**

Copy and paste this SQL into the editor:

```sql
-- Drop the existing table and recreate it
DROP TABLE IF EXISTS ticket_emails CASCADE;

CREATE TABLE ticket_emails (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  ticket_id VARCHAR(255) NOT NULL UNIQUE,
  unique_hash TEXT,
  qr_data TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_ticket_emails_recipient ON ticket_emails(recipient_email);
CREATE INDEX idx_ticket_emails_event ON ticket_emails(event_id);
CREATE INDEX idx_ticket_emails_ticket_id ON ticket_emails(ticket_id);
```

**Option B: Keep Existing Data (If you have tickets you want to preserve)**

Copy and paste this SQL instead:

```sql
-- Add missing columns if they don't exist
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS unique_hash TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS qr_data TEXT;
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'sent';

-- Remove columns that are no longer needed (optional)
ALTER TABLE ticket_emails DROP COLUMN IF EXISTS sent_at;
ALTER TABLE ticket_emails DROP COLUMN IF EXISTS ticket_owner;
ALTER TABLE ticket_emails DROP COLUMN IF EXISTS attendee_name;
ALTER TABLE ticket_emails DROP COLUMN IF EXISTS transaction_hash;

-- Modify ticket_id to be VARCHAR and UNIQUE
ALTER TABLE ticket_emails ALTER COLUMN ticket_id TYPE VARCHAR(255);
ALTER TABLE ticket_emails ADD CONSTRAINT ticket_id_unique UNIQUE (ticket_id) ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ticket_emails_recipient ON ticket_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_ticket_emails_event ON ticket_emails(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_emails_ticket_id ON ticket_emails(ticket_id);
```

### Step 3: Run the Query
1. Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
2. You should see "Success. No rows returned" if everything worked

### Step 4: Verify the Table Structure

Run this query to check that the table is set up correctly:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ticket_emails' 
ORDER BY ordinal_position;
```

You should see these columns:
- `id` (integer)
- `event_id` (integer)
- `recipient_email` (character varying)
- `ticket_id` (character varying)
- `unique_hash` (text)
- `qr_data` (text)
- `status` (character varying, default: 'sent')
- `created_at` (timestamp with time zone, default: now())

### Step 5: Test the Application
1. Refresh your application
2. Create a new event
3. Try generating tickets with user emails
4. The error should be fixed!

## What Changed?

### Removed Fields:
- `sent_at` - Replaced with `created_at` which has a default value
- `ticket_owner` - Not needed
- `attendee_name` - Not needed
- `transaction_hash` - Not needed for email-based tickets

### Simplified Schema:
The new schema only includes essential fields and lets the database handle defaults. This prevents the 400 error caused by schema mismatches.

## Troubleshooting

If you still get errors:

1. **Check Supabase API Key**: Make sure your Supabase URL and ANON_KEY are correct in your `.env` file
2. **Check RLS Policies**: You might need to disable Row Level Security (RLS) for testing:
   ```sql
   ALTER TABLE ticket_emails DISABLE ROW LEVEL SECURITY;
   ```
3. **Check Table Permissions**: Make sure the `anon` role has INSERT permissions:
   ```sql
   GRANT INSERT, SELECT ON ticket_emails TO anon;
   ```

## Need Help?

If you continue to experience issues, check the browser console for the exact error message and the Supabase logs in the dashboard.
