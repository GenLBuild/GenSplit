'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toBigInt } from '@/lib/format';

export interface MyRequest {
  id: string;
  split_id: string;
  wallet_address: string;
  amount_owed: bigint;
  paid: boolean;
  invalid_address: boolean;
  disputed: boolean;
  txn_hash: string | null;
  created_at: string;
  split: {
    mode: 'split' | 'payout';
    creator_address: string;
    total_amount: bigint;
    status: string;
  } | null;
}

export function useMyRequests(walletAddress: string | null) {
  const [pending, setPending] = useState<MyRequest[]>([]);
  const [completed, setCompleted] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!walletAddress) { setPending([]); setCompleted([]); return; }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) { setError('Supabase not configured'); return; }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('split_members')
        .select('*, split:splits(mode, creator_address, total_amount, status)')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (err) throw err;

      type RawReq = {
        id: string;
        split_id: string;
        wallet_address: string;
        amount_owed: number;
        paid: boolean;
        invalid_address: boolean;
        disputed: boolean;
        txn_hash: string | null;
        created_at: string;
        split: {
          mode: 'split' | 'payout';
          creator_address: string;
          total_amount: number;
          status: string;
        } | null;
      };

      const mapped: MyRequest[] = (data as RawReq[]).map((r) => ({
        ...r,
        amount_owed: toBigInt(r.amount_owed),
        split: r.split
          ? { ...r.split, total_amount: toBigInt(r.split.total_amount) }
          : null,
      }));

      setPending(mapped.filter((r) => !r.paid && !r.invalid_address));
      setCompleted(mapped.filter((r) => r.paid || r.invalid_address));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  return { pending, completed, loading, error, refetch: fetchRequests };
}
