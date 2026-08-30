import { NextRequest, NextResponse } from 'next/server';
import { checkOne, getSupabase, sweepConfirmingPayments } from '@/lib/verifyPayment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function GET() {
  try {
    const result = await sweepConfirmingPayments();
    return NextResponse.json(
      JSON.parse(JSON.stringify({ ok: true, ...result }, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)))
    );
  } catch (err) {
    console.error('[api/verify-payment] sweep error:', err);
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}