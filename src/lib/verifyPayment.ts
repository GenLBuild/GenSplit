import { createClient } from '@supabase/supabase-js';

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

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function checkOne(
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

export async function sweepConfirmingPayments() {
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
      const result = await checkOne(supabase, m.id, m.txn_hash, creatorAddress, String(m.amount_owed));
      if (result.ok) confirmed++;
      details.push({ memberId: m.id, txnHash: m.txn_hash, result });
    } catch (e) {
      details.push({ memberId: m.id, txnHash: m.txn_hash, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { checked, confirmed, details };
}