'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { AddressValidator } from '@/components/AddressValidator';
import { usePayoutScreening } from '@/hooks/usePayoutScreening';
import { sendGEN } from '@/lib/genlayerClient';
import { genToWei, formatGEN } from '@/lib/format';
import { isValidGenLayerAddress } from '@/lib/validation';
import { supabase } from '@/lib/supabaseClient';
import type { PayoutRecipient } from './PayoutCsvImportPanel';

interface PayoutFormProps {
  recipients: PayoutRecipient[];
  onUpdateRecipients: (r: PayoutRecipient[]) => void;
  fromAddress: string;
  maxBalanceWei: bigint;
  onSuccess: () => void;
}

type PayoutStatus = 'idle' | 'screening' | 'sending' | 'done';

export function PayoutForm({
  recipients,
  onUpdateRecipients,
  fromAddress,
  maxBalanceWei,
  onSuccess,
}: PayoutFormProps) {
  const { screenAddresses, isScreening, error: screeningError } = usePayoutScreening();
  const [status, setStatus] = useState<PayoutStatus>('idle');
  const [totalAmount, setTotalAmount] = useState('');
  const [equalSplit, setEqualSplit] = useState(true);
  const equalAmount =
    recipients.length > 0 && totalAmount
      ? (parseFloat(totalAmount) / recipients.length).toFixed(6)
      : '';

  // Re-distribute whenever the recipient count changes while equal split is on
  useEffect(() => {
    if (equalSplit && totalAmount && recipients.length > 0) {
      const per = (parseFloat(totalAmount) / recipients.length).toFixed(6);
      const alreadyCorrect = recipients.every((r) => r.amount === per);
      if (!alreadyCorrect) {
        onUpdateRecipients(recipients.map((r) => ({ ...r, amount: per })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipients.length, equalSplit, totalAmount]);
  const [screenResult, setScreenResult] = useState<{ passed: boolean; flagged: string[] } | null>(null);
  const [txResults, setTxResults] = useState<{ wallet: string; hash: string; success: boolean; error?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalWei = recipients.reduce((sum, r) => {
    try { return sum + genToWei(r.amount); } catch { return sum; }
  }, 0n);

  const isOverBalance = totalWei > maxBalanceWei;
  const allValid = recipients.length > 0 && recipients.every((r) => isValidGenLayerAddress(r.wallet) && parseFloat(r.amount) > 0);

  const handleMaxAll = () => {
    if (recipients.length === 0) return;
    const perRecipient = maxBalanceWei / BigInt(recipients.length);
    // Format back to GEN string
    const perGEN = (Number(perRecipient) / 1e18).toFixed(6);
    onUpdateRecipients(recipients.map((r) => ({ ...r, amount: perGEN })));
  };

  const handleSend = async () => {
    if (!allValid) { setError('Fix invalid addresses or amounts before sending'); return; }
    if (isOverBalance) { setError('Total exceeds your GEN balance'); return; }

    setError(null);

    // Step 1: Screen payout
    setStatus('screening');
    const contractConfigured = !!process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING;

    if (!contractConfigured) {
      // Fail closed — screening is required, never assume "passed" when the contract isn't configured
      setError('Payout screening contract is not configured — sends are blocked until it is deployed.');
      setStatus('idle');
      return;
    }

    const screening = await screenAddresses(recipients.map((r) => r.wallet));
    setScreenResult(screening);
    if (!screening) {
      // Fail closed — any screening error (network, config, parsing, decoding) blocks the send
      setError(screeningError || 'Screening failed — send blocked for safety.');
      setStatus('idle');
      return;
    }
    if (!screening.passed) {
      setStatus('idle');
      return;
    }

    // Step 2: Send GEN to each recipient (proven reliable — one signature per transfer)
    setStatus('sending');
    const results: typeof txResults = [];

    for (const recipient of recipients) {
      try {
        const amountWei = genToWei(recipient.amount);
        const hash = await sendGEN(fromAddress, recipient.wallet, amountWei);
        results.push({ wallet: recipient.wallet, hash, success: true });
        await supabase.from('public_feed').insert({
          event_type: 'payout_sent',
          amount: Number(amountWei),
        });
      } catch (err) {
        results.push({
          wallet: recipient.wallet,
          hash: '',
          success: false,
          error: err instanceof Error ? err.message : 'Transfer failed',
        });
      }
    }

    const totalWeiSent = recipients.reduce((sum, r) => {
      try { return sum + genToWei(r.amount); } catch { return sum; }
    }, 0n);
    await supabase.from('payout_batches').insert({
      sender_address: fromAddress.toLowerCase(),
      total_amount: Number(totalWeiSent),
      recipient_count: recipients.length,
      recipients: recipients.map((r) => ({ wallet: r.wallet, amount: r.amount })),
      tx_hash: results[0]?.hash ?? null,
      status: results.every((r) => r.success) ? 'sent' : 'failed',
    });

    setTxResults(results);
    setStatus('done');
    if (results.every((r) => r.success)) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      {/* Total amount + equal/custom toggle, matching Split a Bill */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Total Amount (GEN)</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="any"
            value={totalAmount}
            onChange={(e) => {
              setTotalAmount(e.target.value);
              if (equalSplit && recipients.length > 0) {
                const per = e.target.value
                  ? (parseFloat(e.target.value) / recipients.length).toFixed(6)
                  : '';
                onUpdateRecipients(recipients.map((r) => ({ ...r, amount: per })));
              }
            }}
            placeholder="0.00"
            className="w-full text-lg px-4 py-3 pr-16 rounded-xl border border-zinc-200 focus:border-zinc-400 outline-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">GEN</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const next = !equalSplit;
          setEqualSplit(next);
          if (next && totalAmount && recipients.length > 0) {
            const per = (parseFloat(totalAmount) / recipients.length).toFixed(6);
            onUpdateRecipients(recipients.map((r) => ({ ...r, amount: per })));
          }
        }}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <div className="text-left">
          <p className="font-semibold text-sm">{equalSplit ? 'Equal split' : 'Custom amounts'}</p>
          <p className="text-xs text-zinc-500">
            {equalSplit ? `Each recipient gets ${equalAmount || '—'} GEN` : 'Set each amount individually'}
          </p>
        </div>
        {equalSplit ? <ToggleRight size={28} className="text-black" /> : <ToggleLeft size={28} />}
      </button>

      {/* Recipient rows */}
      {recipients.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-1">
            <p className="col-span-7 text-xs font-medium text-zinc-500">Wallet Address</p>
            <p className="col-span-4 text-xs font-medium text-zinc-500">Amount (GEN)</p>
            <p className="col-span-1" />
          </div>
          <AnimatePresence initial={false}>
            {recipients.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="grid grid-cols-12 gap-2 items-start"
              >
                <div className="col-span-7">
                  <AddressValidator
                    value={r.wallet}
                    onChange={(v) =>
                      onUpdateRecipients(recipients.map((rec) => rec.id === r.id ? { ...rec, wallet: v } : rec))
                    }
                  />
                </div>
                <div className="col-span-4 relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={r.amount}
                    onChange={(e) =>
                      onUpdateRecipients(recipients.map((rec) => rec.id === r.id ? { ...rec, amount: e.target.value } : rec))
                    }
                    placeholder="0.00"
                    className="w-full text-sm px-3 py-2.5 pr-12 rounded-lg border border-zinc-200 focus:border-zinc-400 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">GEN</span>
                </div>
                <div className="col-span-1 flex justify-center pt-1">
                  <button
                    onClick={() => onUpdateRecipients(recipients.filter((rec) => rec.id !== r.id))}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Summary bar */}
      {recipients.length > 0 && (
        <div className={`flex items-center justify-between p-3 rounded-xl text-sm ${isOverBalance ? 'bg-red-50 border border-red-200' : 'bg-zinc-50 border border-zinc-200'}`}>
          <div>
            <span className="text-zinc-500">Total: </span>
            <span className={`font-bold ${isOverBalance ? 'text-red-600' : 'text-zinc-900'}`}>
              {formatGEN(totalWei)}
            </span>
            <span className="text-zinc-400 text-xs ml-2">
              Balance: {formatGEN(maxBalanceWei)}
            </span>
          </div>
          <button
            onClick={handleMaxAll}
            className="text-xs font-semibold text-zinc-600 hover:text-black underline"
          >
            MAX (÷{recipients.length})
          </button>
        </div>
      )}

      {/* Screening result */}
      <AnimatePresence>
        {screenResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${
              screenResult.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {screenResult.passed ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <div>
              {screenResult.passed
                ? 'Payout screening passed — batch is clear to send'
                : `Screening blocked ${(screenResult.flagged ?? []).length} address(es): ${(screenResult.flagged ?? []).join(', ')}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tx results */}
      <AnimatePresence>
        {txResults.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-600">Transaction results:</p>
            {txResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${r.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {r.success ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> : <AlertCircle size={12} className="text-red-500 shrink-0" />}
                <span className="font-mono truncate text-zinc-600">{r.wallet.slice(0, 10)}…</span>
                {r.success ? (
                  <a href={`https://explorer.testnet-chain.genlayer.com/tx/${r.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate ml-auto">
                    {r.hash.slice(0, 10)}…
                  </a>
                ) : (
                  <span className="text-red-600 ml-auto">{r.error}</span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      {status !== 'done' && (
        <motion.button
          onClick={handleSend}
          disabled={!allValid || isOverBalance || status !== 'idle' || isScreening}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {status === 'screening' && <><Loader2 size={16} className="animate-spin" /><Shield size={14} />Screening addresses…</>}
          {status === 'sending' && <><Loader2 size={16} className="animate-spin" />Sending GEN…</>}
          {status === 'idle' && <><Shield size={14} />Screen & Send {recipients.length > 0 ? `${recipients.length} Payout${recipients.length > 1 ? 's' : ''}` : ''}</>}
        </motion.button>
      )}

      {!process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING && (
        <p className="text-xs text-amber-600 text-center">
          ⚠️ Payout screening contract not configured — deploy <code>payout_screening.py</code> and set{' '}
          <code>NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING</code>
        </p>
      )}
    </div>
  );
}
