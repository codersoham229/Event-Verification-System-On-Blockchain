# Premium Dashboard Setup Guide

## 🎨 Features

The premium dashboard includes:

- **Real-time Analytics**: Live updates using Supabase real-time subscriptions
- **Event Performance Tracking**: Detailed metrics for each event
- **Transaction History**: Complete audit trail of all ticket activities
- **User Statistics**: Track user engagement and spending
- **Beautiful UI**: Modern, gradient-based design with smooth animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js**: Version 18 or higher
3. **Package Manager**: npm or yarn

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (takes ~2 minutes)
3. Note down your:
   - Project URL (found in Settings → API)
   - Anon/Public Key (found in Settings → API)

### Step 2: Run Database Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire content from `supabase-schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

This will create:
- All necessary tables (events, tickets, ticket_transactions, user_profiles, dashboard_analytics)
- Database indexes for performance
- Automatic triggers for updating statistics
- Views for analytics
- Row Level Security (RLS) policies

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 4: Install Dependencies

```bash
npm install
```

The dashboard requires:
- `@supabase/supabase-js` - Supabase client library (already installed)
- All existing UI components

### Step 5: Run the Application

```bash
npm run dev
```

The dashboard will be available at:
- Main App: `http://localhost:5000`
- Dashboard: `http://localhost:5000/dashboard`

## 📊 Database Schema Overview

### Tables

#### `events`
Stores event information from the blockchain:
- `event_id`: Unique event identifier from smart contract
- `event_name`: Name of the event
- `event_date`: When the event takes place
- `max_capacity`: Maximum number of tickets
- `ticket_price`: Price per ticket in ETH
- `organizer_address`: Wallet address of event organizer
- `total_tickets_sold`: Automatically updated count

#### `tickets`
Stores individual ticket NFTs:
- `ticket_id`: Unique ticket identifier
- `event_id`: Reference to parent event
- `owner_address`: Current owner's wallet
- `is_used`: Whether ticket has been used
- `verified_at`: Timestamp of verification
- `qr_code`: QR code data for verification

#### `ticket_transactions`
Audit log for all ticket activities:
- `action`: Type of action (minted, verified, used)
- `transaction_hash`: Blockchain transaction hash
- `timestamp`: When the action occurred

#### `user_profiles`
User statistics and information:
- `wallet_address`: User's wallet address
- `total_tickets_purchased`: Count of tickets bought
- `total_spent`: Total ETH spent
- `last_activity`: Last transaction timestamp

#### `dashboard_analytics`
Pre-computed daily analytics for fast queries

### Views

- `v_dashboard_summary`: Overall statistics
- `v_event_analytics`: Per-event performance metrics
- `v_recent_transactions`: Latest 100 transactions
- `v_top_users`: Top users by spending

### Functions

- `get_dashboard_stats()`: Fetch current statistics
- `get_event_performance(days_back)`: Get performance over time
- `refresh_analytics()`: Update daily analytics

## 🔄 Syncing Blockchain Data

To populate the dashboard with data from your smart contract, you'll need to sync blockchain events to Supabase. Here's how:

### Option 1: Manual Sync (for testing)

Insert sample data directly in Supabase SQL Editor:

```sql
-- Insert a sample event
INSERT INTO events (event_id, event_name, event_date, location, max_capacity, ticket_price, organizer_address)
VALUES (1, 'Blockchain Summit 2025', '2025-12-15 10:00:00', 'San Francisco', 500, 0.05, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

-- Insert sample tickets
INSERT INTO tickets (ticket_id, event_id, token_id, owner_address, price)
VALUES 
  (1, 1, 1001, '0x1234567890123456789012345678901234567890', 0.05),
  (2, 1, 1002, '0x2345678901234567890123456789012345678901', 0.05);
```

### Option 2: Automatic Sync with Webhooks

Create a server endpoint to listen for blockchain events and sync to Supabase:

```typescript
// server/supabase-sync.ts
import { supabase } from '../client/src/lib/supabase';

export async function syncEventToSupabase(eventData: any) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      event_id: eventData.eventId,
      event_name: eventData.name,
      event_date: new Date(eventData.date * 1000),
      location: eventData.location,
      max_capacity: eventData.maxCapacity,
      ticket_price: eventData.ticketPrice,
      organizer_address: eventData.organizer,
    });
  
  return { data, error };
}

export async function syncTicketToSupabase(ticketData: any) {
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      ticket_id: ticketData.ticketId,
      event_id: ticketData.eventId,
      token_id: ticketData.tokenId,
      owner_address: ticketData.owner,
      price: ticketData.price,
      transaction_hash: ticketData.txHash,
    });
  
  return { data, error };
}
```

## 🎯 Usage

### Accessing the Dashboard

Navigate to `/dashboard` in your browser:
```
http://localhost:5000/dashboard
```

### Dashboard Features

1. **Stats Cards**: Overview of key metrics
   - Total Events
   - Total Tickets Sold
   - Total Revenue
   - Total Users

2. **Events Tab**: 
   - View all events with performance metrics
   - See ticket sales, verification rates
   - Check capacity utilization
   - View organizer information

3. **Transactions Tab**:
   - Real-time transaction feed
   - Filter by action type (minted, verified, used)
   - View transaction hashes
   - Link to blockchain explorer

4. **Analytics Tab**:
   - 30-day performance trends
   - Verification status overview
   - Revenue trends
   - User activity metrics

### Real-time Updates

The dashboard automatically updates when:
- New events are created
- Tickets are minted
- Tickets are verified
- Any database changes occur

## 🔒 Security Considerations

### Row Level Security (RLS)

The schema includes RLS policies. You may want to customize them:

```sql
-- Example: Restrict event creation to verified organizers
CREATE POLICY "Only verified organizers can create events"
    ON events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE wallet_address = organizer_address 
            AND role = 'organizer'
        )
    );
```

### API Keys

- **Never commit** your `.env` file to git
- Use **Anon/Public key** for frontend (safe to expose)
- Use **Service Role key** only in backend (keep secret)

## 🎨 Customization

### Styling

The dashboard uses Tailwind CSS with custom gradients:
- Primary: `from-indigo-600 to-purple-600`
- Background: `from-slate-50 via-blue-50 to-indigo-50`

To customize colors, edit the classes in `dashboard.tsx`

### Adding New Metrics

1. Add fields to the database
2. Update views in `supabase-schema.sql`
3. Update TypeScript types in `lib/supabase.ts`
4. Add UI components in `dashboard.tsx`

## 📱 Mobile Responsiveness

The dashboard is fully responsive with:
- Grid layouts that adapt to screen size
- Scrollable tables on mobile
- Touch-friendly buttons
- Optimized card layouts

## 🐛 Troubleshooting

### "Failed to load dashboard data"

1. Check your Supabase credentials in `.env`
2. Verify the SQL migration ran successfully
3. Check browser console for errors
4. Ensure Supabase project is active

### "No data showing"

1. Ensure you've inserted test data or synced blockchain data
2. Check Supabase table viewer to verify data exists
3. Review RLS policies - they might be blocking access

### Real-time updates not working

1. Verify real-time is enabled in Supabase (Settings → API)
2. Check browser console for WebSocket connection errors
3. Ensure RLS policies allow SELECT on tables

## 📚 API Reference

### Supabase Client Methods Used

```typescript
// Fetch data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .order('created_at', { ascending: false });

// Call RPC function
const { data, error } = await supabase
  .rpc('function_name', { param: value });

// Subscribe to changes
const subscription = supabase
  .channel('channel_name')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'table_name' 
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

## 🚀 Production Deployment

Before deploying to production:

1. **Enable RLS**: Ensure all tables have proper RLS policies
2. **Environment Variables**: Set production Supabase credentials
3. **Backup Strategy**: Configure automated backups in Supabase
4. **Monitoring**: Set up Supabase dashboard alerts
5. **Analytics**: Consider enabling Supabase Analytics
6. **Rate Limiting**: Implement rate limiting for API calls

## 📊 Performance Optimization

The dashboard is optimized with:
- Pre-computed views for fast queries
- Automatic triggers for updating counts
- Indexed columns for quick lookups
- Efficient real-time subscriptions
- Pagination ready (increase limits as needed)

## 🎓 Next Steps

1. Integrate with your smart contract events
2. Add user authentication with Supabase Auth
3. Create organizer dashboard views
4. Add export functionality (CSV, PDF)
5. Implement advanced filtering and search
6. Add charts with Recharts library
7. Create email notifications for events

## 💡 Tips

- Run `refresh_analytics()` daily via cron job
- Use the views for read-heavy operations
- Keep transactions table for audit trails
- Index any new filter columns
- Use Supabase Studio for easy data management

## 🤝 Support

For issues or questions:
- Check Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- Review SQL schema comments
- Test queries in Supabase SQL Editor
- Check browser console for detailed errors

---

**Enjoy your premium dashboard! 🎉**
