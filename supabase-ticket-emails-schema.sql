-- Create table for ticket email records
CREATE TABLE IF NOT EXISTS ticket_emails (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  ticket_owner VARCHAR(255) NOT NULL,
  attendee_name VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  qr_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ticket_id for faster queries
CREATE INDEX idx_ticket_emails_ticket_id ON ticket_emails(ticket_id);

-- Create index on recipient_email for faster queries
CREATE INDEX idx_ticket_emails_recipient_email ON ticket_emails(recipient_email);

-- Create index on event_id for faster queries
CREATE INDEX idx_ticket_emails_event_id ON ticket_emails(event_id);

-- Add comment to table
COMMENT ON TABLE ticket_emails IS 'Stores records of tickets sent to email addresses';
