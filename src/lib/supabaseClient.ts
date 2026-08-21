'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — avoids module-level instantiation during SSR build
// When env vars are not set, all DB calls will fail gracefully with empty states
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a no-op proxy client when not configured
    // All queries will return { data: null, error: { message: 'Supabase not configured' } }
    _supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false },
    });
    return _supabase;
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _supabase;
}

// Proxy object — all access goes through the lazy getter
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export type Database = {
  public: {
    Tables: {
      splits: {
        Row: {
          id: string;
          mode: 'split' | 'payout';
          total_amount: number;
          creator_address: string;
          status: 'active' | 'closed' | 'cancelled' | 'expired';
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          mode: 'split' | 'payout';
          total_amount: number;
          creator_address: string;
          status?: 'active' | 'closed' | 'cancelled' | 'expired';
          created_at?: string;
          expires_at?: string | null;
        };
      };
      split_members: {
        Row: {
          id: string;
          split_id: string;
          wallet_address: string;
          amount_owed: number;
          paid: boolean;
          invalid_address: boolean;
          disputed: boolean;
          txn_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          split_id: string;
          wallet_address: string;
          amount_owed: number;
          paid?: boolean;
          invalid_address?: boolean;
          disputed?: boolean;
          txn_hash?: string | null;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          split_member_id: string;
          txn_hash: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          split_member_id: string;
          txn_hash: string;
          amount: number;
          created_at?: string;
        };
      };
      public_feed: {
        Row: {
          id: string;
          event_type: 'split_created' | 'payout_sent' | 'split_closed';
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: 'split_created' | 'payout_sent' | 'split_closed';
          amount: number;
          created_at?: string;
        };
      };
    };
  };
};
