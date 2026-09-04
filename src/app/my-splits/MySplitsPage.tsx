'use client';

import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, AlertCircle, Plus } from 'lucide-react';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { useMySplits } from '@/hooks/useSplits';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { SplitCard } from './SplitCard';

export function MySplitsPage() {
  const { isConnected, address } = useGenLayerWallet();
  const { splits, loading, error, refetch } = useMySplits(address);

  useRealtimeChannel({
    channelName: 'my-splits-updates',
    table: 'splits',
    filter: address ? `creator_address=eq.${address.toLowerCase()}` : undefined,
    onUpdate: refetch,
    onInsert: refetch,
    enabled: !!address,
  });

  // Stable reference — only changes when the actual set of split IDs changes,
  // not on every render (avoids constantly resubscribing the realtime channel below)
  const mySplitIds = useMemo(() => splits.map((s) => s.id), [splits]);

  const handleMemberUpdate = useCallback(
    (payload: Record<string, unknown>) => {
      const changedSplitId = (payload as { split_id?: string })?.split_id;
      if (changedSplitId && mySplitIds.includes(changedSplitId)) {
        refetch();
      }
    },
    [mySplitIds, refetch]
  );

  useRealtimeChannel({
    channelName: 'my-splits-members',
    table: 'split_members',
    onUpdate: handleMemberUpdate,
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
          <p className="text-zinc-500 max-w-sm">Connect to view splits and payouts you have created.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">My Splits</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Splits and payouts you created — live status via Supabase Realtime.
        </p>
      </motion.div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <LayoutGrid size={16} />
          </motion.div>
          Loading your splits…
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error.includes('Supabase not configured')
            ? 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
            : error}
        </div>
      )}

      {!loading && !error && splits.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-4 border-2 border-dashed border-zinc-200 rounded-2xl">
          <Plus size={28} className="text-zinc-300" />
          <div className="text-center">
            <p className="text-zinc-500 font-medium">No splits yet</p>
            <p className="text-zinc-400 text-sm mt-1">Go to &ldquo;Split a Bill&rdquo; to create your first split</p>
          </div>
        </div>
      )}

      {!loading && splits.length > 0 && (
        <div className="space-y-4">
          {splits.map((split) => (
            <SplitCard key={split.id} split={split} onUpdate={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
