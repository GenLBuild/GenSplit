'use client';

import { motion } from 'framer-motion';
import { Inbox, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { useMyRequests } from '@/hooks/usePayments';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { RequestCard } from './RequestCard';

export function RequestsPage() {
  const { isConnected, address } = useGenLayerWallet();
  const { pending, completed, loading, error, refetch } = useMyRequests(address);

  // Live updates — no polling
  useRealtimeChannel({
    channelName: 'requests-updates',
    table: 'split_members',
    filter: address ? `wallet_address=eq.${address.toLowerCase()}` : undefined,
    onUpdate: () => refetch(),
    onInsert: () => refetch(),
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
          <p className="text-zinc-500 max-w-sm">
            Connect your GenLayer wallet to see payment requests sent to you.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Requests</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Incoming GEN payment requests — live via Supabase Realtime.
        </p>
      </motion.div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Inbox size={16} />
          </motion.div>
          Loading requests…
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error.includes('Supabase not configured')
            ? 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
            : error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Pending */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900">Pending</h3>
              {pending.length > 0 && (
                <span className="bg-zinc-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending.length}
                </span>
              )}
            </div>
            {pending.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 border-2 border-dashed border-zinc-100 rounded-2xl">
                <CheckCircle2 size={24} className="text-zinc-300" />
                <p className="text-sm text-zinc-400">No pending payment requests</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {pending.map((r) => (
                  <RequestCard key={r.id} request={r} onUpdate={refetch} />
                ))}
              </div>
            )}
          </section>

          {/* Completed */}
          {completed.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-semibold text-zinc-900">Completed</h3>
              <div className="grid gap-3">
                {completed.map((r) => (
                  <RequestCard key={r.id} request={r} onUpdate={refetch} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
