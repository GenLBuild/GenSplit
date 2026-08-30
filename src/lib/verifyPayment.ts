import { createClient } from '@supabase/supabase-js';
import { createClient as createGenLayerClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export function getGenLayerServerClient() {
  return createGenLayerClient({
    chain: testnetBradbury,
    endpoint: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://rpc.testnet-chain.genlayer.com',
  });
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
  const client = getGenLayerServerClient();

  let receipt: unknown;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txnHash as any,
      status: TransactionStatus.ACCEPTED,
      retries: 5,
      interval: 3000,
    });
  } catch {
    return { ok: false, reason: 'Not yet accepted on GenLayer.' };
  }

  const statusName = (receipt as { status_name?: string })?.status_name;
  if (statusName !== 'ACCEPTED' && statusName !== 'FINALIZED') {
    return { ok: false, reason: `Not accepted yet (status: ${statusName ?? 'unknown'}).` };
  }

  const messages = (receipt as { messages?: { recipient: string; value: string }[] })?.messages ?? [];
  const transferMsg = messages.find((m) => m.recipient?.toLowerCase() === expectedTo.toLowerCase());

  if (!transferMsg) {
    return { ok: false, reason: 'No matching transfer found in this transaction.' };
  }
  if (transferMsg.value !== expectedValueWei) {
    return { ok: false, reason: `Amount mismatch (chain: ${transferMsg.value} wei, expected: ${expectedValueWei} wei).` };
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