/**
 * GenSplit Autonomous Agent — Close Splits
 * 
 * Runs every 5 minutes via GitHub Actions cron.
 * 
 * Actions:
 * 1. Close splits where all members have paid=true → status='closed'
 * 2. Expire splits past expires_at with status='active' → status='expired'
 * 
 * Pure Supabase logic — no GenLayer calls in the agent.
 * Source of truth for payment status is the split_members table,
 * which is updated by the frontend after real GenLayer tx confirmation.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function closeFullyPaidSplits(): Promise<void> {
  console.log('[agent] Checking for fully paid splits to close...');

  // Get all active splits with their members
  const { data: activeSplits, error } = await supabase
    .from('splits')
    .select('id, split_members(id, paid)')
    .eq('status', 'active');

  if (error) {
    console.error('[agent] Error fetching active splits:', error);
    return;
  }

  if (!activeSplits || activeSplits.length === 0) {
    console.log('[agent] No active splits found');
    return;
  }

  const toClose: string[] = [];

  for (const split of activeSplits) {
    const members = (split.split_members as { id: string; paid: boolean }[]) ?? [];
    if (members.length === 0) continue;
    if (members.every((m) => m.paid)) {
      toClose.push(split.id);
    }
  }

  if (toClose.length === 0) {
    console.log('[agent] No splits ready to close');
    return;
  }

  console.log(`[agent] Closing ${toClose.length} fully paid split(s):`, toClose);

  const { error: updateError } = await supabase
    .from('splits')
    .update({ status: 'closed' })
    .in('id', toClose);

  if (updateError) {
    console.error('[agent] Error closing splits:', updateError);
  } else {
    // Record in public_feed
    for (const splitId of toClose) {
      const { data: split } = await supabase
        .from('splits')
        .select('total_amount')
        .eq('id', splitId)
        .single();

      if (split) {
        await supabase.from('public_feed').insert({
          event_type: 'split_closed',
          amount: split.total_amount,
        });
      }
    }
    console.log(`[agent] Closed ${toClose.length} split(s) successfully`);
  }
}

async function expireOldSplits(): Promise<void> {
  console.log('[agent] Checking for expired splits...');

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('splits')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', now)
    .select('id');

  if (error) {
    console.error('[agent] Error expiring splits:', error);
    return;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`[agent] Expired ${count} split(s)`);
  } else {
    console.log('[agent] No splits to expire');
  }
}

async function main(): Promise<void> {
  console.log('[agent] GenSplit close-splits agent running at', new Date().toISOString());
  
  await closeFullyPaidSplits();
  await expireOldSplits();
  
  console.log('[agent] Done');
}

main().catch((err) => {
  console.error('[agent] Fatal error:', err);
  process.exit(1);
});
