-- ============================================================
-- Supabase Storage bucket for encrypted enrollment photos
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create private storage bucket (not publicly accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('enrollment-photos', 'enrollment-photos', false, 5242880)  -- 5 MB limit
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for the bucket

-- Allow authenticated users to upload their own enrollment photos
CREATE POLICY "Authenticated users can upload enrollment photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enrollment-photos'
);

-- Allow authenticated users to read enrollment photos (organizers need this)
CREATE POLICY "Authenticated users can read enrollment photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'enrollment-photos'
);

-- Allow authenticated users to delete their own photos (cleanup)
CREATE POLICY "Authenticated users can delete enrollment photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'enrollment-photos'
);
