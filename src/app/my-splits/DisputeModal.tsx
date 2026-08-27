'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDisputeResolution } from '@/hooks/useDisputeResolution';
import type { SplitMember } from '@/types/split';
import { formatGEN, shortenAddress } from '@/lib/format';

interface DisputeModalProps {
  member: SplitMember;
  onClose: () => void;
  onResolved: () => void;
}

export function DisputeModal({ member, onClose, onResolved }: DisputeModalProps) {
  const [claimText, setClaimText] = useState('');
  const [txnHash, setTxnHash] = useState(member.txn_hash ?? '');
  const { isSubmitting, result, error, submitDispute, reset } = useDisputeResolution();

  const contractConfigured = !!process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE;

  const handleSubmit = async () => {
    if (!claimText.trim()) return;
    await submitDispute(member.id, claimText, txnHash, member.wallet_address, member.amount_owed);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                <Shield size={16} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">Submit Dispute</h3>
                <p className="text-xs text-zinc-500">Resolved via GenLayer Intelligent Contract</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400">
              <X size={16} />
            </button>
          </div>

          {!contractConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              ⚠️ Dispute resolution contract not yet deployed. Deploy{' '}
              <code>contracts/dispute_resolution.py</code> on GenLayer Studio and set{' '}
              <code>NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE</code> to enable this feature.
            </div>
          )}

          {/* Member info */}
          <div className="p-3 bg-zinc-50 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Wallet</span>
              <span className="font-mono font-semibold">{shortenAddress(member.wallet_address)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Amount owed</span>
              <span className="font-semibold">{formatGEN(member.amount_owed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status</span>
              <span className={member.paid ? 'text-emerald-600' : member.invalid_address ? 'text-red-500' : 'text-yellow-600'}>
                {member.paid ? 'Paid' : member.invalid_address ? 'Declined' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Claim form */}
          {!result && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">
                  Transaction Hash (if payment was made)
                </label>
                <input
                  type="text"
                  value={txnHash}
                  onChange={(e) => setTxnHash(e.target.value)}
                  placeholder="0x… (optional)"
                  className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">
                  Your claim / evidence *
                </label>
                <textarea
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  placeholder="Explain your dispute — include transaction evidence, amounts, and what you believe happened…"
                  rows={4}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-400 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border space-y-2 ${result.fulfilled ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex items-center gap-2">
                  {result.fulfilled ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-500" />}
                  <p className="font-semibold text-sm">
                    {result.fulfilled ? 'Dispute resolved — payment confirmed' : 'Dispute rejected — evidence insufficient'}
                  </p>
                </div>
                <p className="text-xs text-zinc-600">{result.reasoning}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {!result && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting || !claimText.trim() || !contractConfigured}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? 'Submitting…' : 'Submit to GenLayer'}
              </motion.button>
            </div>
          )}

          {result && (
            <motion.button
              onClick={() => { reset(); onResolved(); onClose(); }}
              className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm font-medium"
              whileHover={{ scale: 1.01 }}
            >
              Close
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
