/**
 * GenSplit Agent API route — triggered by QStash on a schedule.
 *
 * Actions:
 * 1. Close splits where all members have paid=true -> status='closed'
 * 2. Expire splits past expires_at with status='active' -> status='expired'
 *
 * Pure Supabase logic — no GenLayer calls here. Payment status is only
 * ever set by the frontend after a real GenLayer tx confirms.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

async function closeFullyPaidSplits(supabase: ReturnType<typeof getSupabase>) {
  const { data: activeSplits, error } = await supabase
    .from('splits')
    .select('id, split_members(id, paid)')
    .eq('status', 'active');

  if (error) throw error;
  if (!activeSplits || activeSplits.length === 0) return { closed: 0 };

  const toClose: string[] = [];
  for (const split of activeSplits) {
    const members = (split.split_members as { id: string; paid: boolean }[]) ?? [];
    if (members.length === 0) continue;
    if (members.every((m) => m.paid)) toClose.push(split.id);
  }

  if (toClose.length === 0) return { closed: 0 };

  const { error: updateError } = await supabase
    .from('splits')
    .update({ status: 'closed' })
    .in('id', toClose);

  if (updateError) throw updateError;

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

  return { closed: toClose.length };
}

async function expireOldSplits(supabase: ReturnType<typeof getSupabase>) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('splits')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', now)
    .select('id');

  if (error) throw error;
  return { expired: data?.length ?? 0 };
}

async function sweepConfirmingPayments(req: NextRequest) {
  const baseUrl = req.nextUrl.origin;
  const res = await fetch(`${baseUrl}/api/verify-payment`, { method: 'GET' });
  const data = await res.json();
  return { paymentsChecked: data.checked ?? 0, paymentsConfirmed: data.confirmed ?? 0 };
}

async function runAgent(req: NextRequest) {
  const supabase = getSupabase();
  const sweepResult = await sweepConfirmingPayments(req);
  const closeResult = await closeFullyPaidSplits(supabase);
  const expireResult = await expireOldSplits(supabase);
  return {
    ok: true,
    ranAt: new Date().toISOString(),
    ...sweepResult,
    ...closeResult,
    ...expireResult,
  };
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AGENT_SECRET;
  if (!secret) return true; // no secret configured yet — allow (set one before going live)
  const provided = req.headers.get('x-agent-secret');
  return provided === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runAgent(req);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/agent] error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Allow GET too, so it's easy to trigger manually from a browser/QStash "run now" button
export async function GET(req: NextRequest) {
  return POST(req);
}