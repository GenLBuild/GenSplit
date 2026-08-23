'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, X, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatGEN, formatDate, shortenAddress } from '@/lib/format';
import { sendGEN } from '@/lib/genlayerClient';
import { markMemberPaid, markMemberDeclined } from '@/hooks/useSplits';
import type { MyRequest } from '@/hooks/usePayments';

interface RequestCardProps {
  request: MyRequest;
  onUpdate: () => void;
}

export function RequestCard({ request, onUpdate }: RequestCardProps) {
  const [paying, setPaying] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setPaying(true);
    setError(null);
    try {
      const hash = await sendGEN(
        request.wallet_address,
        request.split?.creator_address ?? '',
        request.amount_owed
      );
      await markMemberPaid(request.id, hash, request.amount_owed);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await markMemberDeclined(request.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setDeclining(false);
    }
  };

  const status = request.paid ? 'paid' : request.invalid_address ? 'declined' : request.disputed ? 'disputed' : 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} pulse={status === 'pending'} />
            <span className="text-xs text-zinc-400 capitalize">{request.split?.mode ?? 'split'}</span>
          </div>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">
            {formatGEN(request.amount_owed)}
          </p>
          <p className="text-xs text-zinc-500">
            Requested by{' '}
            <span className="font-mono font-semibold text-zinc-700">
              {shortenAddress(request.split?.creator_address ?? '')}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">{formatDate(request.created_at)}</p>
          {request.txn_hash && (
            <a
              href={`https://explorer.testnet-chain.genlayer.com/tx/${request.txn_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 justify-end"
            >
              <ExternalLink size={10} />
              View tx
            </a>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </p>
      )}

      {status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <motion.button
            onClick={handlePay}
            disabled={paying || declining}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {paying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {paying ? 'Sending…' : `Pay ${formatGEN(request.amount_owed)}`}
          </motion.button>
          <motion.button
            onClick={handleDecline}
            disabled={paying || declining}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {declining ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Decline
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
