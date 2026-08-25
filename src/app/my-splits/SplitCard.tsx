'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Shield, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ShareLinkButton } from '@/components/ShareLinkButton';
import { PayoutResultSummary } from './PayoutResultSummary';
import { DisputeModal } from './DisputeModal';
import { formatGEN, formatDate, shortenAddress, timeAgo } from '@/lib/format';
import type { Split, SplitMember } from '@/types/split';

interface SplitCardProps {
  split: Split;
  onUpdate: () => void;
}

export function SplitCard({ split, onUpdate }: SplitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [disputeMember, setDisputeMember] = useState<SplitMember | null>(null);
  const members = split.members ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
    >
      {/* Header */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={split.status} pulse={split.status === 'active'} />
              <span className="text-xs text-zinc-400 capitalize bg-zinc-100 px-2 py-0.5 rounded-full">
                {split.mode}
              </span>
            </div>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">
              {formatGEN(split.total_amount)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareLinkButton splitId={split.id} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{timeAgo(split.created_at)}</span>
          {split.expires_at && (
            <span>Expires {formatDate(split.expires_at)}</span>
          )}
        </div>

        {members.length > 0 && (
          <PayoutResultSummary members={members} totalAmount={split.total_amount} />
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
      >
        <span>{members.length} recipient{members.length !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Member list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-zinc-100"
          >
            <div className="p-4 space-y-2">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onDispute={() => setDisputeMember(member)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dispute modal */}
      {disputeMember && (
        <DisputeModal
          member={disputeMember}
          onClose={() => setDisputeMember(null)}
          onResolved={() => { setDisputeMember(null); onUpdate(); }}
        />
      )}
    </motion.div>
  );
}

function MemberRow({
  member,
  onDispute,
}: {
  member: SplitMember;
  onDispute: () => void;
}) {
  const canDispute = (member.paid || member.invalid_address) && !member.disputed;
  const status = member.paid
    ? 'paid'
    : member.disputed
    ? 'disputed'
    : member.invalid_address
    ? 'declined'
    : 'pending';

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-zinc-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <StatusBadge status={status} className="shrink-0" />
        <span className="font-mono text-xs text-zinc-600 truncate">
          {shortenAddress(member.wallet_address)}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-zinc-900">
          {formatGEN(member.amount_owed)}
        </span>
                {member.txn_hash && (
          <a
            href={`https://explorer.testnet-chain.genlayer.com/tx/${member.txn_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
          >
            <ExternalLink size={12} />
          </a>
        )}
        {canDispute && (
          <motion.button
            onClick={onDispute}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            title="Open a dispute if this payment status looks wrong — an AI-judged on-chain contract will review your claim and any evidence you provide."
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition-colors"
          >
            <Shield size={13} />
            Dispute
          </motion.button>
        )}
      </div>
    </div>
  );
}
