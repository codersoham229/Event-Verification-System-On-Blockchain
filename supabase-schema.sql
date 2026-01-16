-- ============================================
-- Event Verification System Database Schema
-- Supabase SQL Migration
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id BIGINT UNIQUE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    location VARCHAR(500),
    max_capacity INTEGER NOT NULL,
    ticket_price DECIMAL(18, 8) NOT NULL,
    organizer_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42),
    total_tickets_sold INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id BIGINT UNIQUE NOT NULL,
    event_id BIGINT NOT NULL,
    token_id BIGINT NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    is_used BOOLEAN DEFAULT false,
    qr_code TEXT,
    minted_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP,
    verified_at TIMESTAMP,
    transaction_hash VARCHAR(66),
    metadata JSONB,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- Ticket transactions table (audit log)
CREATE TABLE IF NOT EXISTS ticket_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id BIGINT NOT NULL,
    ticket_id BIGINT,
    owner_address VARCHAR(42) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'minted', 'verified', 'used', 'transferred'
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(100),
    email VARCHAR(255),
    total_tickets_purchased INTEGER DEFAULT 0,
    total_spent DECIMAL(18, 8) DEFAULT 0,
    role VARCHAR(20) DEFAULT 'user', -- 'user', 'organizer', 'admin'
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Dashboard analytics table (for quick access)
CREATE TABLE IF NOT EXISTS dashboard_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    total_events INTEGER DEFAULT 0,
    total_tickets INTEGER DEFAULT 0,
    verified_tickets INTEGER DEFAULT 0,
    used_tickets INTEGER DEFAULT 0,
    total_revenue DECIMAL(18, 8) DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_address);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner_address);
CREATE INDEX IF NOT EXISTS idx_tickets_used ON tickets(is_used);
CREATE INDEX IF NOT EXISTS idx_tickets_token ON tickets(token_id);

CREATE INDEX IF NOT EXISTS idx_transactions_event ON ticket_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_owner ON ticket_transactions(owner_address);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON ticket_transactions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_role ON user_profiles(role);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update ticket count when ticket is minted
CREATE OR REPLACE FUNCTION update_event_ticket_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET total_tickets_sold = total_tickets_sold + 1
        WHERE event_id = NEW.event_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic ticket count
DROP TRIGGER IF EXISTS update_ticket_count ON tickets;
CREATE TRIGGER update_ticket_count
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_event_ticket_count();

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_profiles (wallet_address, total_tickets_purchased, total_spent)
        VALUES (NEW.owner_address, 1, NEW.price)
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
            total_tickets_purchased = user_profiles.total_tickets_purchased + 1,
            total_spent = user_profiles.total_spent + NEW.price,
            last_activity = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user stats
DROP TRIGGER IF EXISTS update_user_stats_trigger ON tickets;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- ============================================
-- VIEWS
-- ============================================

-- Dashboard summary view
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
    COUNT(DISTINCT e.id) as total_events,
    COUNT(DISTINCT t.id) as total_tickets,
    COUNT(DISTINCT CASE WHEN t.verified_at IS NOT NULL THEN t.id END) as verified_tickets,
    COUNT(DISTINCT CASE WHEN t.is_used = true THEN t.id END) as used_tickets,
    COALESCE(SUM(t.price), 0) as total_revenue,
    COUNT(DISTINCT u.wallet_address) as total_users,
    COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN u.wallet_address END) as new_users_week
FROM events e
LEFT JOIN tickets t ON e.event_id = t.event_id
LEFT JOIN user_profiles u ON t.owner_address = u.wallet_address;

-- Event analytics view
CREATE OR REPLACE VIEW v_event_analytics AS
SELECT 
    e.event_id,
    e.event_name,
    e.event_date,
    e.location,
    e.max_capacity,
    e.ticket_price,
    e.organizer_address,
    COUNT(t.id) as tickets_sold,
    COUNT(CASE WHEN t.is_used = true THEN 1 END) as tickets_used,
    COUNT(CASE WHEN t.verified_at IS NOT NULL THEN 1 END) as tickets_verified,
    COALESCE(SUM(t.price), 0) as revenue,
    ROUND(COUNT(t.id)::NUMERIC / NULLIF(e.max_capacity, 0) * 100, 2) as capacity_percentage,
    e.created_at
FROM events e
LEFT JOIN tickets t ON e.event_id = t.event_id
GROUP BY e.event_id, e.event_name, e.event_date, e.location, 
         e.max_capacity, e.ticket_price, e.organizer_address, e.created_at
ORDER BY e.created_at DESC;

-- Recent transactions view
CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT 
    tt.id,
    tt.event_id,
    e.event_name,
    tt.ticket_id,
    tt.owner_address,
    tt.action,
    tt.transaction_hash,
    tt.timestamp,
    t.price
FROM ticket_transactions tt
JOIN events e ON tt.event_id = e.event_id
LEFT JOIN tickets t ON tt.ticket_id = t.ticket_id
ORDER BY tt.timestamp DESC
LIMIT 100;

-- Top users view
CREATE OR REPLACE VIEW v_top_users AS
SELECT 
    wallet_address,
    username,
    total_tickets_purchased,
    total_spent,
    role,
    created_at,
    last_activity
FROM user_profiles
ORDER BY total_spent DESC
LIMIT 50;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for public read access (adjust as needed)
CREATE POLICY "Public events are viewable by everyone"
    ON events FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can view their own tickets"
    ON tickets FOR SELECT
    USING (true); -- Adjust based on your auth setup

CREATE POLICY "Public transactions are viewable"
    ON ticket_transactions FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (true);

CREATE POLICY "Dashboard analytics are public"
    ON dashboard_analytics FOR SELECT
    USING (true);

-- Insert policies (adjust based on your authentication)
CREATE POLICY "Authenticated users can create events"
    ON events FOR INSERT
    WITH CHECK (true); -- Add proper auth check

CREATE POLICY "Authenticated users can mint tickets"
    ON tickets FOR INSERT
    WITH CHECK (true); -- Add proper auth check

-- ============================================
-- INITIAL DATA & FUNCTIONS
-- ============================================

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_events BIGINT,
    total_tickets BIGINT,
    verified_tickets BIGINT,
    used_tickets BIGINT,
    total_revenue NUMERIC,
    total_users BIGINT,
    new_users_week BIGINT
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM v_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to get event performance
CREATE OR REPLACE FUNCTION get_event_performance(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    events_created INTEGER,
    tickets_sold INTEGER,
    revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(e.created_at) as date,
        COUNT(DISTINCT e.id)::INTEGER as events_created,
        COUNT(t.id)::INTEGER as tickets_sold,
        COALESCE(SUM(t.price), 0) as revenue
    FROM events e
    LEFT JOIN tickets t ON e.event_id = t.event_id 
        AND DATE(t.minted_at) = DATE(e.created_at)
    WHERE e.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(e.created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO dashboard_analytics (
        date, total_events, total_tickets, verified_tickets, 
        used_tickets, total_revenue, active_users
    )
    SELECT 
        CURRENT_DATE,
        COUNT(DISTINCT e.id)::INTEGER,
        COUNT(DISTINCT t.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN t.verified_at IS NOT NULL THEN t.id END)::INTEGER,
        COUNT(DISTINCT CASE WHEN t.is_used = true THEN t.id END)::INTEGER,
        COALESCE(SUM(t.price), 0),
        COUNT(DISTINCT u.wallet_address)::INTEGER
    FROM events e
    LEFT JOIN tickets t ON e.event_id = t.event_id
    LEFT JOIN user_profiles u ON t.owner_address = u.wallet_address
    ON CONFLICT (date) 
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        total_tickets = EXCLUDED.total_tickets,
        verified_tickets = EXCLUDED.verified_tickets,
        used_tickets = EXCLUDED.used_tickets,
        total_revenue = EXCLUDED.total_revenue,
        active_users = EXCLUDED.active_users,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (Optional - Remove in production)
-- ============================================

-- Insert sample data for testing
-- Uncomment below to add sample data

-- INSERT INTO events (event_id, event_name, event_date, location, max_capacity, ticket_price, organizer_address) VALUES
-- (1, 'Blockchain Summit 2025', '2025-12-15 10:00:00', 'San Francisco, CA', 500, 0.05, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'),
-- (2, 'NFT Art Exhibition', '2025-11-20 14:00:00', 'New York, NY', 200, 0.03, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'),
-- (3, 'Web3 Developer Conference', '2025-12-01 09:00:00', 'Austin, TX', 1000, 0.08, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

COMMENT ON TABLE events IS 'Stores event information from blockchain';
COMMENT ON TABLE tickets IS 'Stores ticket NFT information';
COMMENT ON TABLE ticket_transactions IS 'Audit log for all ticket-related transactions';
COMMENT ON TABLE user_profiles IS 'User profiles and statistics';
COMMENT ON TABLE dashboard_analytics IS 'Pre-computed analytics for dashboard';
