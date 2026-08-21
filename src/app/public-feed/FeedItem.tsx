'use client';

import { motion } from 'framer-motion';
import { Split, SendHorizonal, CheckCircle2 } from 'lucide-react';
import { formatGENCompact, timeAgo } from '@/lib/format';
import type { PublicFeedEvent } from '@/types/split';

interface FeedItemProps {
  event: PublicFeedEvent;
  index: number;
}

const EVENT_CONFIG = {
  split_created: {
    icon: <Split size={14} />,
    label: 'Split Created',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  payout_sent: {
    icon: <SendHorizonal size={14} />,
    label: 'Payout Sent',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  split_closed: {
    icon: <CheckCircle2 size={14} />,
    label: 'Split Closed',
    color: 'text-zinc-600',
    bg: 'bg-zinc-50',
    border: 'border-zinc-100',
  },
} as const;

export function FeedItem({ event, index }: FeedItemProps) {
  const config = EVENT_CONFIG[event.event_type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`flex items-center gap-4 p-4 rounded-xl border ${config.border} ${config.bg} hover:shadow-sm transition-shadow`}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center ${config.color} border ${config.border} shrink-0`}>
        {config.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
        </div>
        <p className="text-sm font-black text-zinc-900 mt-0.5">
          {formatGENCompact(event.amount)}
        </p>
      </div>

      {/* Time */}
      <div className="text-xs text-zinc-400 shrink-0">{timeAgo(event.created_at)}</div>
    </motion.div>
  );
}
