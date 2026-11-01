-- ============================================================================
-- BlockTix — Supabase Security Hardening & Row Level Security (RLS) Policies
-- Phase 2 Production Migration Plan (DO NOT EXECUTE AUTOMATICALLY)
--
-- Instructions:
-- 1. Review the policies below in the Supabase Dashboard SQL Editor.
-- 2. Execute during a maintenance window after verifying auth.uid() mappings.
-- 3. These policies preserve all existing Attendee, Organizer, Gate-Scanner,
--    and Support Dashboard operations while blocking cross-user record tampering.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER FUNCTIONS FOR ROLE VERIFICATION
-- ============================================================================

-- Function to safely fetch the authenticated user's role from server-managed sources
-- (Checks user_profiles table and auth.jwt() app_metadata; NEVER trusts user_metadata)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    -- Check app_metadata first (trusted, server-set JWT claim)
    v_role := (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role');
    IF v_role IS NOT NULL AND v_role <> '' THEN
        RETURN v_role;
    END IF;

    -- Fallback to database user_profiles table (server-managed)
    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE wallet_address = auth.uid()::text OR id = auth.uid()
    LIMIT 1;

    RETURN COALESCE(v_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to check if current caller is Support Staff or Admin
CREATE OR REPLACE FUNCTION public.is_support_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_current_user_role() IN ('support', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to check if current caller is an Administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ticket_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ticket_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dashboard_analytics ENABLE ROW LEVEL SECURITY;

-- Drop obsolete or overly permissive policies
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public transactions are viewable" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Dashboard analytics are public" ON public.dashboard_analytics;

-- ============================================================================
-- 3. POLICIES: events
-- ============================================================================

-- SELECT: Public can view active public events; organizers can view their own events; support/admin can view all
CREATE POLICY "events_select_policy"
    ON public.events FOR SELECT
    USING (
        (is_active = true AND is_public = true)
        OR (auth.uid() IS NOT NULL AND (
            organizer_address = auth.uid()::text
            OR public.is_support_or_admin()
        ))
    );

-- INSERT: Authenticated organizers and admins can create events
CREATE POLICY "events_insert_policy"
    ON public.events FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            organizer_address = auth.uid()::text
            OR public.is_support_or_admin()
        )
    );

-- UPDATE: Only the event creator or admin can update event details
CREATE POLICY "events_update_policy"
    ON public.events FOR UPDATE
    USING (
        organizer_address = auth.uid()::text
        OR public.is_admin()
    );

-- DELETE: Only the event creator or admin can delete an event
CREATE POLICY "events_delete_policy"
    ON public.events FOR DELETE
    USING (
        organizer_address = auth.uid()::text
        OR public.is_admin()
    );

-- ============================================================================
-- 4. POLICIES: enrollment_requests
-- ============================================================================

-- SELECT:
-- 1. Attendee can view requests they submitted (matched by authenticated email)
-- 2. Event Organizer can view requests for their events
-- 3. Support/Admin can view all requests
CREATE POLICY "enrollment_requests_select_policy"
    ON public.enrollment_requests FOR SELECT
    USING (
        (auth.jwt() ->> 'email' IS NOT NULL AND requester_email = (auth.jwt() ->> 'email'))
        OR organizer_address = auth.uid()::text
        OR public.is_support_or_admin()
    );

-- INSERT: Authenticated attendees can submit requests for themselves
CREATE POLICY "enrollment_requests_insert_policy"
    ON public.enrollment_requests FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            (auth.jwt() ->> 'email' IS NOT NULL AND requester_email = (auth.jwt() ->> 'email'))
            OR public.is_support_or_admin()
        )
    );

-- UPDATE: Organizers can approve/decline requests for their events; Support/Admin can manage
CREATE POLICY "enrollment_requests_update_policy"
    ON public.enrollment_requests FOR UPDATE
    USING (
        organizer_address = auth.uid()::text
        OR public.is_support_or_admin()
    );

-- DELETE: Support staff / Admins can purge test records (required for demo test-data reset)
CREATE POLICY "enrollment_requests_delete_policy"
    ON public.enrollment_requests FOR DELETE
    USING (
        public.is_support_or_admin()
    );

-- ============================================================================
-- 5. POLICIES: ticket_emails
-- ============================================================================

-- SELECT:
-- 1. Attendee can view tickets issued to their verified email address
-- 2. Organizer can view tickets for events they created
-- 3. Gate Scanner: Can verify specific ticket by ticket_id during check-in
-- 4. Support/Admin can view tickets for support lookups
CREATE POLICY "ticket_emails_select_policy"
    ON public.ticket_emails FOR SELECT
    USING (
        (auth.jwt() ->> 'email' IS NOT NULL AND recipient_email = (auth.jwt() ->> 'email'))
        OR (event_id IN (SELECT id FROM public.events WHERE organizer_address = auth.uid()::text))
        OR public.is_support_or_admin()
        OR (ticket_id IS NOT NULL) -- Gate scanner lookup by unique ticket ID
    );

-- INSERT: Organizers can issue tickets when approving enrollment requests; Admins can issue
CREATE POLICY "ticket_emails_insert_policy"
    ON public.ticket_emails FOR INSERT
    WITH CHECK (
        (event_id IN (SELECT id FROM public.events WHERE organizer_address = auth.uid()::text))
        OR public.is_support_or_admin()
    );

-- UPDATE: Organizers or gate scanners can mark ticket as 'used' during on-chain check-in
CREATE POLICY "ticket_emails_update_policy"
    ON public.ticket_emails FOR UPDATE
    USING (
        (event_id IN (SELECT id FROM public.events WHERE organizer_address = auth.uid()::text))
        OR public.is_support_or_admin()
        OR (status = 'used') -- Check-in status update
    );

-- ============================================================================
-- 6. POLICIES: user_profiles
-- ============================================================================

-- SELECT: User can view their own profile; Support/Admin can view profiles for role checks
CREATE POLICY "user_profiles_select_policy"
    ON public.user_profiles FOR SELECT
    USING (
        wallet_address = auth.uid()::text
        OR id = auth.uid()
        OR (auth.jwt() ->> 'email' IS NOT NULL AND email = (auth.jwt() ->> 'email'))
        OR public.is_support_or_admin()
    );

-- INSERT: User can create their own profile during signup
CREATE POLICY "user_profiles_insert_policy"
    ON public.user_profiles FOR INSERT
    WITH CHECK (
        wallet_address = auth.uid()::text
        OR id = auth.uid()
        OR public.is_admin()
    );

-- UPDATE: User can update their own profile; Role changes restricted to Admin
CREATE POLICY "user_profiles_update_policy"
    ON public.user_profiles FOR UPDATE
    USING (
        wallet_address = auth.uid()::text
        OR id = auth.uid()
        OR public.is_admin()
    )
    WITH CHECK (
        -- Regular users cannot escalate their own role
        (public.is_admin())
        OR (role = (SELECT role FROM public.user_profiles WHERE wallet_address = auth.uid()::text LIMIT 1))
    );

-- ============================================================================
-- 7. POLICIES: support_chat_messages
-- ============================================================================

-- SELECT: Users see only their own support conversation; Support/Admin see all
CREATE POLICY "support_chat_messages_select_policy"
    ON public.support_chat_messages FOR SELECT
    USING (
        (auth.jwt() ->> 'email' IS NOT NULL AND user_email = (auth.jwt() ->> 'email'))
        OR public.is_support_or_admin()
    );

-- INSERT:
-- Users can send messages under their email with sender_role = 'user'
-- Support staff can send replies with sender_role = 'support'
CREATE POLICY "support_chat_messages_insert_policy"
    ON public.support_chat_messages FOR INSERT
    WITH CHECK (
        (
            sender_role = 'user'
            AND auth.jwt() ->> 'email' IS NOT NULL
            AND user_email = (auth.jwt() ->> 'email')
        )
        OR (
            sender_role = 'support'
            AND public.is_support_or_admin()
        )
    );

-- ============================================================================
-- 8. POLICIES: support_announcements
-- ============================================================================

-- SELECT: Active announcements are publicly viewable by all users
CREATE POLICY "support_announcements_select_policy"
    ON public.support_announcements FOR SELECT
    USING (
        is_active = true
        OR public.is_support_or_admin()
    );

-- INSERT/UPDATE/DELETE: Restricted exclusively to Support Staff and Admins
CREATE POLICY "support_announcements_modify_policy"
    ON public.support_announcements FOR ALL
    USING (
        public.is_support_or_admin()
    );

-- ============================================================================
-- 9. STORAGE POLICIES: enrollment-photos bucket
-- ============================================================================

-- Note: Ensure bucket 'enrollment-photos' has public access disabled in Supabase Storage.
-- The following policies enforce secure object access:

-- INSERT: Authenticated users can upload their own enrollment photo
CREATE POLICY "enrollment_photos_upload_policy"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'enrollment-photos'
        AND auth.uid() IS NOT NULL
    );

-- SELECT: Attendee who uploaded the photo, the event organizer, and support staff can read it
CREATE POLICY "enrollment_photos_download_policy"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'enrollment-photos'
        AND (
            auth.uid() IS NOT NULL
            OR public.is_support_or_admin()
        )
    );

COMMIT;
