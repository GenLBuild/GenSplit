import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

async function checkOne(
  supabase: ReturnType<typeof getSupabase>,
  memberId: string,
  txnHash: string,
  expectedTo: string,
  expectedValueWei: string
) {
  const apiUrl = `https://explorer.testnet-chain.genlayer.com/api/v2/transactions/${txnHash}`;
  const res = await fetch(apiUrl);
  if (!res.ok) {
    return { ok: false, reason: 'Transaction not found on the explorer yet.' };
  }
  const tx = await res.json();
  const actualTo = String(tx?.to?.hash ?? '').toLowerCase();
  const actualValue = String(tx?.value ?? '');

  if (actualTo !== expectedTo.toLowerCase()) {
    return { ok: false, reason: 'Recipient does not match this split.' };
  }
  if (actualValue !== expectedValueWei) {
    return { ok: false, reason: `Amount mismatch (chain: ${actualValue}, expected: ${expectedValueWei}).` };
  }

  const { error } = await supabase
    .from('split_members')
    .update({ paid: true, payment_status: 'paid' })
    .eq('id', memberId);
  if (error) throw error;

  return { ok: true };
}

// Manual, single-payment check — called from the join page's "verify manually" button
export async function POST(req: NextRequest) {
  try {
    const { memberId, txnHash, expectedTo, expectedValueWei } = await req.json();
    if (!memberId || !txnHash || !expectedTo || !expectedValueWei) {
      return NextResponse.json({ ok: false, reason: 'Missing fields' }, { status: 400 });
    }
    const supabase = getSupabase();
    const result = await checkOne(supabase, memberId, txnHash, expectedTo, expectedValueWei);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/verify-payment] error:', err);
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Bulk sweep — called by the QStash agent every 5 minutes for anything still "confirming"
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: confirming, error } = await supabase
      .from('split_members')
      .select('id, txn_hash, amount_owed, split_id, splits!inner(creator_address)')
      .eq('payment_status', 'confirming');
    if (error) throw error;

    let checked = 0;
    let confirmed = 0;
    for (const m of confirming ?? []) {
      if (!m.txn_hash) continue;
      checked++;
      const creatorAddress = (m.splits as unknown as { creator_address: string }).creator_address;
      try {
        const result = await checkOne(
          supabase,
          m.id,
          m.txn_hash,
          creatorAddress,
          String(m.amount_owed)
        );
        if (result.ok) confirmed++;
      } catch (e) {
        console.error(`[api/verify-payment] sweep failed for member ${m.id}:`, e);
      }
    }
    return NextResponse.json({ ok: true, checked, confirmed });
  } catch (err) {
    console.error('[api/verify-payment] sweep error:', err);
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}