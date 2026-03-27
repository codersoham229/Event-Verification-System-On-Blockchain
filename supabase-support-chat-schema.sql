-- Support Chat Messages table
-- Stores messages between users and the support team
CREATE TABLE IF NOT EXISTS support_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT DEFAULT 'User',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'support')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching conversations by user
CREATE INDEX IF NOT EXISTS idx_support_chat_user_email ON support_chat_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_support_chat_created ON support_chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access for demo)
CREATE POLICY "Allow all support chat operations"
  ON support_chat_messages FOR ALL
  USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_chat_messages;

-- Support Announcements table
-- Stores notices posted by support team, visible on the website
CREATE TABLE IF NOT EXISTS support_announcements (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE support_announcements ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access for demo)
CREATE POLICY "Allow all announcement operations"
  ON support_announcements FOR ALL
  USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_announcements;
