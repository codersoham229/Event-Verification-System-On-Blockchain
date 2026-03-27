-- ============================================================
-- Add photo columns to enrollment_requests table
-- Run this in the Supabase SQL Editor AFTER creating the storage bucket
-- ============================================================

-- Add columns for encrypted photo storage
ALTER TABLE enrollment_requests
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_encryption_key TEXT,
  ADD COLUMN IF NOT EXISTS photo_encryption_iv TEXT,
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN DEFAULT false;

-- Index for quick filtering by photo status
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_has_photo
  ON enrollment_requests (has_photo);

-- Update RLS: organizers can read encryption keys for their events
-- (They already have SELECT on enrollment_requests for their events via existing policy)
