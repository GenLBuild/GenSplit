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
  if (json.error) return null;
  return json.result;
}

export async function POST(req: NextRequest) {
  try {
    const { txnHash, expectedWallet, expectedAmountWei } = await req.json();
    if (!txnHash) return NextResponse.json({ verified: false });

    const receipt = await rpcCall('eth_getTransactionReceipt', [txnHash]);
    if (!receipt || receipt.status !== '0x1') {
      return NextResponse.json({ verified: false });
    }
    const tx = await rpcCall('eth_getTransactionByHash', [txnHash]);
    const actualTo = String(tx?.to ?? '').toLowerCase();
    const actualValueWei = BigInt(tx?.value ?? '0x0').toString();

    const verified =
      actualTo === String(expectedWallet ?? '').toLowerCase() &&
      actualValueWei === String(expectedAmountWei ?? '');

    return NextResponse.json({ verified });
  } catch {
    return NextResponse.json({ verified: false });
  }
}