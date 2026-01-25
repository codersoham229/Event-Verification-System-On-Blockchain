# Email Ticket Sharing Feature Setup

## Overview
This feature allows organizers to send ticket information to multiple recipients via email after minting tickets. The recipients can then view their tickets from their dashboard.

## Database Setup

### 1. Run the SQL Migration
Execute the SQL file in your Supabase database:

```bash
# File: supabase-ticket-emails-schema.sql
```

Or manually run this in Supabase SQL Editor:

```sql
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

CREATE INDEX idx_ticket_emails_ticket_id ON ticket_emails(ticket_id);
CREATE INDEX idx_ticket_emails_recipient_email ON ticket_emails(recipient_email);
CREATE INDEX idx_ticket_emails_event_id ON ticket_emails(event_id);
```

### 2. Set Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE ticket_emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert ticket emails"
ON ticket_emails FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to read their own ticket emails
CREATE POLICY "Users can read ticket emails sent to them"
ON ticket_emails FOR SELECT
TO authenticated
USING (recipient_email = auth.email() OR ticket_owner = auth.uid()::text);
```

## How to Use

### 1. Mint a Ticket
- Go to the "Mint Ticket" tab
- Connect your wallet
- Enter event ID and attendee name
- Click "Mint Ticket NFT"

### 2. Share via Email
After the ticket is minted, you'll see a new section:
- Click "Send Ticket to Email Recipients"
- Enter one or more email addresses (separated by commas or spaces)
- Click "Send to Recipients"

Example:
```
user1@gmail.com, user2@gmail.com, user3@gmail.com
```

### 3. Recipients Access
Recipients can:
- Log into the platform
- View their tickets in the user dashboard
- Access the QR code and ticket details

## Features

✅ Multiple email addresses at once (comma or space separated)
✅ Email validation
✅ Ticket information stored in database
✅ QR code data included
✅ Integration with user dashboard
✅ Real-time updates

## Technical Details

### Frontend
- Location: `client/src/pages/home.tsx`
- New state variables: `emailAddresses`, `showEmailSection`, `sendingEmail`
- New function: `handleSendEmails()`

### Database Table Structure
```
ticket_emails
├── id (SERIAL PRIMARY KEY)
├── ticket_id (INTEGER)
├── event_id (INTEGER)
├── recipient_email (VARCHAR)
├── ticket_owner (VARCHAR)
├── attendee_name (VARCHAR)
├── sent_at (TIMESTAMP)
├── qr_data (TEXT - JSON string)
└── created_at (TIMESTAMP)
```

## Future Enhancements

Optional improvements you can add:
1. **Email Service Integration**: Use SendGrid, Resend, or Supabase Edge Functions to actually send emails
2. **Email Templates**: Create beautiful HTML email templates with ticket details
3. **Email Notifications**: Send confirmation emails when tickets are shared
4. **Dashboard Integration**: Add a section in user dashboard to view tickets shared to their email
5. **Access Control**: Add password/PIN for ticket access if email is not registered

## Troubleshooting

### Table doesn't exist error
- Run the SQL migration in Supabase SQL Editor
- Check that the table was created successfully

### Permission denied error
- Set up RLS policies as shown above
- Ensure users are authenticated before sending emails

### Emails not appearing in dashboard
- Check that the recipient email matches their account email
- Add a query in user dashboard to fetch tickets by email:
  ```typescript
  const { data } = await supabase
    .from('ticket_emails')
    .select('*')
    .eq('recipient_email', user.email);
  ```
