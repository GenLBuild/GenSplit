'use client';

import { motion } from 'framer-motion';
import type { SplitStatus } from '@/types/split';

type StatusType = SplitStatus | 'paid' | 'pending' | 'confirming' | 'disputed' | 'declined';

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; dot: string }> = {
  active: { label: 'Active', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  closed: { label: 'Closed', color: 'bg-zinc-100 text-zinc-600 border-zinc-200', dot: 'bg-zinc-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-400' },
  expired: { label: 'Expired', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  confirming: { label: 'Confirming', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  disputed: { label: 'Disputed', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  declined: { label: 'Declined', color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-400' },
};

interface StatusBadgeProps {
  status: StatusType;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, pulse, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </motion.span>
  );
}
