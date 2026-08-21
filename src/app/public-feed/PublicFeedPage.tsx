'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { FeedItem } from './FeedItem';
import type { PublicFeedEvent } from '@/types/split';
import { toBigInt } from '@/lib/format';

interface RawFeedEvent {
  id: string;
  event_type: 'split_created' | 'payout_sent' | 'split_closed';
  amount: number;
  created_at: string;
}

export function PublicFeedPage() {
  const [events, setEvents] = useState<PublicFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  const fetchEvents = useCallback(async () => {
    if (!supabaseConfigured) { setLoading(false); return; }
    try {
      const { data, error: err } = await supabase
        .from('public_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setEvents(
        (data as RawFeedEvent[]).map((e) => ({
          ...e,
          amount: toBigInt(e.amount),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [supabaseConfigured]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime subscription — no wallet address stored in public_feed by design
  useRealtimeChannel({
    channelName: 'public-feed-live',
    table: 'public_feed',
    onInsert: (payload) => {
      const raw = payload as unknown as RawFeedEvent;
      const newEvent: PublicFeedEvent = {
        ...raw,
        amount: toBigInt(raw.amount),
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
      setRealtimeConnected(true);
    },
    enabled: supabaseConfigured,
  });

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Public Feed</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Anonymous on-chain activity — no wallet addresses stored.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {realtimeConnected ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-emerald-600"
            >
              <Wifi size={14} />
              Live
            </motion.span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <WifiOff size={14} />
              Connecting…
            </span>
          )}
        </div>
      </motion.div>

      {!supabaseConfigured && (
        <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl text-center space-y-2">
          <Globe size={28} className="text-zinc-300 mx-auto" />
          <p className="text-sm font-semibold text-zinc-700">Supabase not configured</p>
          <p className="text-xs text-zinc-500">
            Set <code className="bg-zinc-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="bg-zinc-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to see the public feed.
          </p>
        </div>
      )}

      {loading && supabaseConfigured && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-shimmer bg-zinc-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && supabaseConfigured && events.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 border-2 border-dashed border-zinc-100 rounded-2xl">
          <Globe size={28} className="text-zinc-300" />
          <p className="text-sm text-zinc-400">No activity yet — create a split or payout to see events here</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {events.map((event, idx) => (
          <FeedItem key={event.id} event={event} index={idx} />
        ))}
      </AnimatePresence>
    </div>
  );
}
