-- ============================================================
-- Chat messages table for user ↔ organizer communication
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('user', 'organizer')),
  organizer_address VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_event_id ON chat_messages (event_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_email ON chat_messages (sender_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_organizer ON chat_messages (organizer_address);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at);

-- Composite index for fetching a specific conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages (event_id, sender_email, organizer_address, created_at);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages
CREATE POLICY "Authenticated users can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can read messages in their own conversations
CREATE POLICY "Users can read their own conversations"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
