import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseAnonKey !== 'placeholder-key' &&
         supabaseUrl.includes('supabase.co');
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DashboardStats {
  total_events: number;
  total_tickets: number;
  verified_tickets: number;
  revenue: number;
}

export interface EventAnalytics {
  event_id: string;
  event_name: string;
  event_date: string;
  location: string;
  max_capacity: number;
  ticket_price: string;
  organizer_address: string;
  tickets_sold: number;
  tickets_used: number;
  tickets_verified: number;
  revenue: number;
  capacity_percentage: string;
  created_at: string;
}

export interface TicketTransaction {
  id: string;
  event_id: string;
  event_name: string;
  ticket_id: string;
  owner_address: string;
  action: 'minted' | 'verified' | 'used';
  timestamp: string;
  transaction_hash: string;
  price?: number;
}

export interface UserActivity {
  address: string;
  total_tickets: number;
  total_spent: number;
  last_activity: string;
}
