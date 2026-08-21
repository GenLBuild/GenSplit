'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Split, SplitMember, CreateSplitInput } from '@/types/split';
import { toBigInt } from '@/lib/format';

interface RawSplit {
  id: string;
  mode: 'split' | 'payout';
  total_amount: number;
  creator_address: string;
  status: 'active' | 'closed' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string | null;
  split_members?: RawSplitMember[];
}

interface RawSplitMember {
  id: string;
  split_id: string;
  wallet_address: string;
  amount_owed: number;
  paid: boolean;
  invalid_address: boolean;
  disputed: boolean;
  txn_hash: string | null;
  created_at: string;
}

function mapSplit(raw: RawSplit): Split {
  return {
    ...raw,
    total_amount: toBigInt(raw.total_amount),
    members: raw.split_members?.map(mapMember),
  };
}

function mapMember(raw: RawSplitMember): SplitMember {
  return {
    ...raw,
    amount_owed: toBigInt(raw.amount_owed),
  };
}

export function useMySplits(creatorAddress: string | null) {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSplits = useCallback(async () => {
    if (!creatorAddress) { setSplits([]); return; }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) { setError('Supabase not configured'); return; }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('splits')
        .select('*, split_members(*)')
        .eq('creator_address', creatorAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (err) throw err;
      setSplits((data as RawSplit[]).map(mapSplit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load splits');
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => { fetchSplits(); }, [fetchSplits]);

  return { splits, loading, error, refetch: fetchSplits };
}

export async function createSplit(input: CreateSplitInput): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase not configured');

  // Insert split
  const { data: splitData, error: splitErr } = await supabase
    .from('splits')
    .insert({
      mode: input.mode,
      total_amount: Number(input.total_amount),
      creator_address: input.creator_address.toLowerCase(),
      status: 'active',
      expires_at: input.expires_at ?? null,
    })
    .select()
    .single();

  if (splitErr || !splitData) throw splitErr ?? new Error('Failed to create split');

  const splitId = splitData.id as string;

  // Insert members
  const members = input.recipients.map((r) => ({
    split_id: splitId,
    wallet_address: r.wallet_address.toLowerCase(),
    amount_owed: Number(r.amount_owed),
    paid: false,
    invalid_address: false,
    disputed: false,
  }));

  const { error: membersErr } = await supabase.from('split_members').insert(members);
  if (membersErr) throw membersErr;

  // Insert public feed event
  await supabase.from('public_feed').insert({
    event_type: 'split_created',
    amount: Number(input.total_amount),
  });

  return splitId;
}

export async function markMemberPaid(
  memberId: string,
  txnHash: string,
  amountWei: bigint
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase not configured');

  // Mark member paid
  const { error: memberErr } = await supabase
    .from('split_members')
    .update({ paid: true, txn_hash: txnHash })
    .eq('id', memberId);

  if (memberErr) throw memberErr;

  // Insert payment record
  const { error: paymentErr } = await supabase.from('payments').insert({
    split_member_id: memberId,
    txn_hash: txnHash,
    amount: Number(amountWei),
  });

  if (paymentErr) throw paymentErr;
}

export async function markMemberDeclined(memberId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('split_members')
    .update({ invalid_address: true }) // reused to mark declined
    .eq('id', memberId);

  if (error) throw error;
}

export async function flagDispute(memberId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('split_members')
    .update({ disputed: true })
    .eq('id', memberId);

  if (error) throw error;
}
