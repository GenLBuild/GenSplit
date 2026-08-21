'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatGEN } from '@/lib/format';
import type { SplitMember } from '@/types/split';

interface PayoutResultSummaryProps {
  members: SplitMember[];
  totalAmount: bigint;
}

export function PayoutResultSummary({ members, totalAmount }: PayoutResultSummaryProps) {
  const paid = members.filter((m) => m.paid);
  const declined = members.filter((m) => m.invalid_address && !m.paid);
  const pending = members.filter((m) => !m.paid && !m.invalid_address);
  const disputed = members.filter((m) => m.disputed);

  const paidAmount = paid.reduce((s, m) => s + m.amount_owed, 0n);
  const pendingAmount = pending.reduce((s, m) => s + m.amount_owed, 0n);

  const paidPercent = totalAmount > 0n ? Number((paidAmount * 100n) / totalAmount) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
          <span>{formatGEN(paidAmount)} collected</span>
          <span>{paidPercent}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-black rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${paidPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          label="Paid"
          count={paid.length}
          amount={paidAmount}
          color="bg-emerald-50 border-emerald-200"
        />
        <StatCard
          icon={<Clock size={14} className="text-yellow-500" />}
          label="Pending"
          count={pending.length}
          amount={pendingAmount}
          color="bg-yellow-50 border-yellow-200"
        />
        <StatCard
          icon={<XCircle size={14} className="text-red-400" />}
          label="Declined"
          count={declined.length}
          amount={declined.reduce((s, m) => s + m.amount_owed, 0n)}
          color="bg-red-50 border-red-200"
        />
        <StatCard
          icon={<AlertTriangle size={14} className="text-orange-500" />}
          label="Disputed"
          count={disputed.length}
          amount={disputed.reduce((s, m) => s + m.amount_owed, 0n)}
          color="bg-orange-50 border-orange-200"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  count,
  amount,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  amount: bigint;
  color: string;
}) {
  return (
    <div className={`p-2.5 rounded-xl border ${color} space-y-0.5`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-zinc-700">{label}</span>
      </div>
      <p className="text-lg font-black text-zinc-900">{count}</p>
      <p className="text-xs text-zinc-500">{formatGEN(amount)}</p>
    </div>
  );
}
