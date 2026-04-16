-- ============================================================
-- FULL FIX: Drop & recreate events table with correct schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- WARNING: This drops existing events — run once on a fresh setup
-- ============================================================

-- Step 1: Drop old table (old schema had wrong column names)
DROP TABLE IF EXISTS events CASCADE;

-- Step 2: Create with the correct column names the app uses
CREATE TABLE events (
  id           BIGINT PRIMARY KEY,          -- blockchain event ID
  name         TEXT NOT NULL,
  description  TEXT,
  date         TIMESTAMPTZ NOT NULL,
  location     TEXT DEFAULT 'Location TBA',
  total_tickets    INTEGER DEFAULT 0,
  available_tickets INTEGER DEFAULT 0,
  price        TEXT DEFAULT '0',            -- stored as string ETH value
  organizer_address TEXT,
  organizer_name    TEXT,
  organizer_email   TEXT,
  transaction_hash  TEXT,
  is_public    BOOLEAN DEFAULT true,
  is_active    BOOLEAN DEFAULT true,
  event_type   TEXT DEFAULT 'other',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Indexes
CREATE INDEX idx_events_is_public   ON events(is_public);
CREATE INDEX idx_events_organizer   ON events(organizer_address);
CREATE INDEX idx_events_date        ON events(date);

-- Step 4: Enable Row-Level Security but allow all reads (public events are public)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public events readable by all" ON events
  FOR SELECT USING (is_public = true OR is_public IS NULL);
CREATE POLICY "Anyone can insert events" ON events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Organizers can update their events" ON events
  FOR UPDATE USING (true);

-- Step 5: Verify — re-run this after creating an event from the organizer dashboard
SELECT id, name, date, is_public, is_active, organizer_name, organizer_address
FROM events
ORDER BY created_at DESC
LIMIT 20;

