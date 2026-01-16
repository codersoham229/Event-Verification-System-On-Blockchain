import { supabase } from './supabase';
import type { Event, Ticket } from '@/types/web3';

/**
 * Utility functions to sync blockchain data with Supabase
 */

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Sync an event from blockchain to Supabase
 */
export async function syncEventToSupabase(
  eventId: number,
  eventData: Event,
  organizerAddress: string,
  contractAddress?: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .upsert({
        event_id: eventId,
        event_name: eventData.name,
        event_date: new Date(Number(eventData.date) * 1000).toISOString(),
        location: eventData.description || '',
        max_capacity: Number(eventData.maxTickets),
        ticket_price: eventData.ticketPrice,
        organizer_address: organizerAddress.toLowerCase(),
        contract_address: contractAddress?.toLowerCase(),
        is_active: true,
      }, {
        onConflict: 'event_id'
      });

    if (error) {
      console.error('Error syncing event to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception syncing event:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Sync a ticket from blockchain to Supabase
 */
export async function syncTicketToSupabase(
  ticketId: number,
  eventId: number,
  ticketData: Ticket,
  ownerAddress: string,
  price: string,
  transactionHash?: string,
  qrCode?: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .upsert({
        ticket_id: ticketId,
        event_id: eventId,
        token_id: Number(ticketData.tokenId),
        owner_address: ownerAddress.toLowerCase(),
        price: price,
        is_used: ticketData.isUsed,
        qr_code: qrCode,
        transaction_hash: transactionHash?.toLowerCase(),
        verified_at: null,
        used_at: ticketData.isUsed ? new Date().toISOString() : null,
      }, {
        onConflict: 'ticket_id'
      });

    if (error) {
      console.error('Error syncing ticket to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception syncing ticket:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Log a transaction to Supabase
 */
export async function logTransactionToSupabase(
  eventId: number,
  ticketId: number | null,
  ownerAddress: string,
  action: 'created' | 'minted' | 'verified' | 'used' | 'transferred',
  transactionHash?: string,
  blockNumber?: number,
  gasUsed?: bigint,
  metadata?: any
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .from('ticket_transactions')
      .insert({
        event_id: eventId,
        ticket_id: ticketId,
        owner_address: ownerAddress.toLowerCase(),
        action,
        transaction_hash: transactionHash?.toLowerCase(),
        block_number: blockNumber,
        gas_used: gasUsed ? Number(gasUsed) : null,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error logging transaction to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception logging transaction:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Update or create user profile
 */
export async function updateUserProfile(
  walletAddress: string,
  username?: string,
  email?: string,
  role: 'user' | 'organizer' | 'admin' = 'user'
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        username,
        email,
        role,
        last_activity: new Date().toISOString(),
      }, {
        onConflict: 'wallet_address'
      });

    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception updating user profile:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Mark a ticket as verified in Supabase
 */
export async function markTicketVerified(
  ticketId: number,
  transactionHash?: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        verified_at: new Date().toISOString(),
      })
      .eq('ticket_id', ticketId);

    if (error) {
      console.error('Error marking ticket as verified:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception marking ticket as verified:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Mark a ticket as used in Supabase
 */
export async function markTicketUsed(
  ticketId: number,
  transactionHash?: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('ticket_id', ticketId);

    if (error) {
      console.error('Error marking ticket as used:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception marking ticket as used:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Refresh analytics (should be called periodically)
 */
export async function refreshAnalytics(): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.rpc('refresh_analytics');

    if (error) {
      console.error('Error refreshing analytics:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception refreshing analytics:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Batch sync multiple events
 */
export async function batchSyncEvents(
  events: Array<{
    eventId: number;
    eventData: Event;
    organizerAddress: string;
    contractAddress?: string;
  }>
): Promise<SyncResult> {
  const results = await Promise.all(
    events.map(e => 
      syncEventToSupabase(e.eventId, e.eventData, e.organizerAddress, e.contractAddress)
    )
  );

  const failures = results.filter(r => !r.success);
  
  if (failures.length > 0) {
    return {
      success: false,
      error: `${failures.length} out of ${events.length} events failed to sync`,
      data: results
    };
  }

  return { success: true, data: results };
}

/**
 * Get user statistics
 */
export async function getUserStats(walletAddress: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found, return empty stats
        return { success: true, data: null };
      }
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error fetching user stats:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
