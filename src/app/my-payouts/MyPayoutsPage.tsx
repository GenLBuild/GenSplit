'use client';

import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { supabase } from '@/lib/supabaseClient';
import { formatGEN } from '@/lib/format';

interface PayoutBatch {
  id: string;
  total_amount: number;
  recipient_count: number;
  recipients: { wallet: string; amount: string }[];
  tx_hash: string | null;
  status: string;
  created_at: string;
}

export function MyPayoutsPage() {
  const { isConnected, address } = useGenLayerWallet();
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    const { data } = await supabase
      .from('payout_batches')
      .select('*')
      .eq('sender_address', address.toLowerCase())
      .order('created_at', { ascending: false });
    setBatches((data as PayoutBatch[]) ?? []);
    setLoading(false);
  }, [address]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useRealtimeChannel({
    channelName: 'my-payouts-updates',
    table: 'payout_batches',
    filter: address ? `sender_address=eq.${address.toLowerCase()}` : undefined,
    onInsert: () => fetchBatches(),
    onUpdate: () => fetchBatches(),
    enabled: !!address,
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Connect your wallet</h2>
          <p className="text-zinc-500 max-w-sm">Connect to view your bulk payout history.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">My Payouts</h2>
        <p className="text-zinc-500 text-sm mt-1">Bulk payout batches you have sent.</p>
      </motion.div>

      {loading && <p className="text-zinc-400 text-sm">Loading...</p>}

      {!loading && batches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl">
          <p className="text-zinc-400 text-sm">No payout batches sent yet</p>
        </div>
      )}

      <div className="space-y-3">
        {batches.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-zinc-200 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {b.status === 'sent' ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <XCircle size={18} className="text-red-500" />
                )}
                <span className="font-bold text-lg">{formatGEN(BigInt(b.total_amount))}</span>
                <span className="text-zinc-400 text-sm">to {b.recipient_count} recipients</span>
              </div>
              {b.tx_hash && (
                
               <a   href={`https://explorer.testnet-chain.genlayer.com/tx/${b.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs underline"
                >
                  View tx
                </a>
              )}
            </div>
            <p className="text-xs text-zinc-400">{new Date(b.created_at).toLocaleString()}</p>
            <div className="space-y-1">
              {b.recipients.map((r, i) => (
                <div key={i} className="flex justify-between text-xs text-zinc-500 font-mono">
                  <span>{r.wallet.slice(0, 10)}...{r.wallet.slice(-6)}</span>
                  <span>{r.amount} GEN</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}