import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function rpcCall(method: string, params: unknown[]) {
  const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://rpc.testnet-chain.genlayer.com';
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'RPC error');
  return json.result;
}

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
  const receipt = await rpcCall('eth_getTransactionReceipt', [txnHash]);
  if (!receipt) {
    return { ok: false, reason: 'Transaction not found or still pending on-chain.' };
  }
  if (receipt.status !== '0x1') {
    return { ok: false, reason: 'Transaction was reverted on-chain.' };
  }

  const tx = await rpcCall('eth_getTransactionByHash', [txnHash]);
  const actualTo = String(tx?.to ?? '').toLowerCase();
  const actualValueWei = BigInt(tx?.value ?? '0x0').toString();

  if (actualTo !== expectedTo.toLowerCase()) {
    return { ok: false, reason: `Recipient mismatch (chain: ${actualTo}, expected: ${expectedTo}).` };
  }
  if (actualValueWei !== expectedValueWei) {
    return { ok: false, reason: `Amount mismatch (chain: ${actualValueWei} wei, expected: ${expectedValueWei} wei).` };
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
    return NextResponse.json(
      JSON.parse(JSON.stringify(result, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)))
    );
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
    const details: unknown[] = [];
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
        details.push({ memberId: m.id, txnHash: m.txn_hash, expectedTo: creatorAddress, expectedAmount: String(m.amount_owed), result });
      } catch (e) {
        details.push({ memberId: m.id, txnHash: m.txn_hash, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return NextResponse.json(
      JSON.parse(JSON.stringify({ ok: true, checked, confirmed, details }, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      ))
    );
  } catch (err) {
    console.error('[api/verify-payment] sweep error:', err);
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}