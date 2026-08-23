'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { StatusBadge } from '@/components/StatusBadge';
import { formatGEN, shortenAddress, formatDate, toBigInt } from '@/lib/format';
import { sendGEN } from '@/lib/genlayerClient';
import { markMemberPaid } from '@/hooks/useSplits';
import type { Split, SplitMember } from '@/types/split';

interface RawSplit {
  id: string;
  mode: 'split' | 'payout';
  total_amount: number;
  creator_address: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  split_members: RawMember[];
}

interface RawMember {
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

export default function JoinPage({ params }: { params: { splitId: string } }) {
  const { splitId } = params;
  const { isConnected, address } = useGenLayerWallet();
  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const fetchSplit = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('splits')
        .select('*, split_members(*)')
        .eq('id', splitId)
        .single();

      if (err) throw err;
      const raw = data as RawSplit;
      setSplit({
        ...raw,
        total_amount: toBigInt(raw.total_amount),
        status: raw.status as Split['status'],
        members: raw.split_members.map((m) => ({
          ...m,
          amount_owed: toBigInt(m.amount_owed),
        })),
      });
    } catch (err) {
      console.error('[JoinPage] fetchSplit error:', err);
      setError(err instanceof Error ? err.message : 'Split not found or Supabase not configured');
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => { fetchSplit(); }, [fetchSplit]);

  const myMember: SplitMember | undefined = split?.members?.find(
    (m) => m.wallet_address === address?.toLowerCase()
  );

  const handlePay = async () => {
    if (!myMember || !address || !split) return;
    setPaying(true);
    setPayError(null);
    try {
      const hash = await sendGEN(address, split.creator_address, myMember.amount_owed);
      await markMemberPaid(myMember.id, hash, myMember.amount_owed);
      setPaySuccess(true);
      await fetchSplit();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-black flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-black text-base">Gen<span className="font-light">Split</span></span>
          </Link>
          <WalletConnectButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-6">
          <ArrowLeft size={14} />
          Back to GenSplit
        </Link>

        {loading && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 size={16} className="animate-spin" />
            Loading split…
          </div>
        )}

        {error && (
          <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {split && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <StatusBadge status={split.status as Split['status']} />
                  <p className="text-4xl font-black text-zinc-900 mt-2 tracking-tight">
                    {formatGEN(split.total_amount)}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Requested by <span className="font-mono font-semibold">{shortenAddress(split.creator_address)}</span>
                  </p>
                </div>
              </div>

              {split.expires_at && (
                <p className="text-xs text-zinc-400">Expires {formatDate(split.expires_at)}</p>
              )}

              {/* Members */}
              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <p className="text-sm font-semibold text-zinc-700">Recipients ({split.members?.length ?? 0})</p>
                {split.members?.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-1.5">
                    <span className="font-mono text-xs text-zinc-500">{shortenAddress(m.wallet_address)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatGEN(m.amount_owed)}</span>
                      <StatusBadge status={m.paid ? 'paid' : m.invalid_address ? 'declined' : 'pending'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My payment */}
            {!isConnected && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-center space-y-3">
                <p className="font-semibold text-zinc-900">Connect your wallet to pay</p>
                <p className="text-sm text-zinc-500">Connect a GenLayer wallet to see your share and pay.</p>
                <div className="flex justify-center">
                  <WalletConnectButton />
                </div>
              </div>
            )}

            {isConnected && !myMember && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Your wallet (<span className="font-mono">{shortenAddress(address!)}</span>) is not in this split.
                </p>
              </div>
            )}

            {isConnected && myMember && !paySuccess && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
                <p className="font-semibold text-zinc-900">Your Share</p>
                <p className="text-3xl font-black text-zinc-900">{formatGEN(myMember.amount_owed)}</p>

                {payError && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-2">{payError}</p>
                )}

                {myMember.paid ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 size={18} />
                    <span className="font-semibold">Already paid</span>
                  </div>
                ) : myMember.invalid_address ? (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <AlertCircle size={18} />
                    <span>Payment declined</span>
                  </div>
                ) : (
                  <motion.button
                    onClick={handlePay}
                    disabled={paying || split.status !== 'active'}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                  >
                    {paying && <Loader2 size={16} className="animate-spin" />}
                    {paying ? 'Sending GEN…' : `Pay ${formatGEN(myMember.amount_owed)}`}
                  </motion.button>
                )}
              </div>
            )}

            {paySuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-3"
              >
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900">Payment sent!</p>
                  <p className="text-sm text-emerald-700">Your GEN transfer has been confirmed on GenLayer.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
