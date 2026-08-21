'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, X, Loader2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { RecipientList, type Recipient } from './RecipientList';
import { CsvImportPanel } from './CsvImportPanel';
import { createSplit } from '@/hooks/useSplits';
import { genToWei } from '@/lib/format';
import { isValidGenLayerAddress } from '@/lib/validation';

interface CreateSplitFormProps {
  creatorAddress: string;
  onCreated: (splitId: string) => void;
  onCancel: () => void;
}

export function CreateSplitForm({ creatorAddress, onCreated, onCancel }: CreateSplitFormProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [totalAmount, setTotalAmount] = useState('');
  const [equalSplit, setEqualSplit] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [showCsv, setShowCsv] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equalAmount =
    recipients.length > 0 && totalAmount
      ? (parseFloat(totalAmount) / recipients.length).toFixed(6)
      : '';

  const addRecipient = () => {
    setRecipients((prev) => [
      ...prev,
      { id: crypto.randomUUID(), wallet: '', amount: '' },
    ]);
  };

  const updateRecipient = (id: string, field: 'wallet' | 'amount', value: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCsvImport = (imported: Recipient[]) => {
    setRecipients((prev) => [...prev, ...imported]);
    // If all imported have amounts, switch to custom mode
    if (imported.every((r) => r.amount && parseFloat(r.amount) > 0)) {
      setEqualSplit(false);
    }
  };

  const validate = (): string | null => {
    if (recipients.length === 0) return 'Add at least one recipient';
    if (!totalAmount || parseFloat(totalAmount) <= 0) return 'Enter a total amount in GEN';
    const invalidAddresses = recipients.filter((r) => !isValidGenLayerAddress(r.wallet));
    if (invalidAddresses.length > 0) return `${invalidAddresses.length} address(es) are invalid`;
    if (!equalSplit) {
      const total = recipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const expected = parseFloat(totalAmount);
      if (Math.abs(total - expected) > 0.000001) {
        return `Custom amounts sum to ${total.toFixed(6)} GEN but total is ${expected} GEN`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError(null);
    try {
      const totalWei = genToWei(totalAmount);
      const perRecipientWei = equalSplit
        ? totalWei / BigInt(recipients.length)
        : 0n;

      const splitId = await createSplit({
        mode: 'split',
        total_amount: totalWei,
        creator_address: creatorAddress,
        expires_at: expiresAt || undefined,
        recipients: recipients.map((r) => ({
          wallet_address: r.wallet,
          amount_owed: equalSplit
            ? perRecipientWei
            : genToWei(r.amount),
        })),
      });

      onCreated(splitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create split');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-zinc-900">New Split</h3>
          <p className="text-xs text-zinc-500 mt-0.5">All amounts in GEN — GenLayer testnet</p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400">
          <X size={16} />
        </button>
      </div>

      {/* Total amount */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-zinc-600 block mb-1">
            Total Amount (GEN)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 pr-12 rounded-lg border border-zinc-200 focus:border-zinc-400 outline-none text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
              GEN
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 block mb-1">
            Expires At (optional)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 focus:border-zinc-400 outline-none text-sm"
          />
        </div>
      </div>

      {/* Split mode toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-900">
            {equalSplit ? 'Equal split' : 'Custom amounts'}
          </p>
          <p className="text-xs text-zinc-500">
            {equalSplit
              ? `Each recipient pays ${equalAmount || '—'} GEN`
              : 'Set individual amounts per recipient'}
          </p>
        </div>
        <motion.button
          onClick={() => setEqualSplit((e) => !e)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-zinc-600 hover:text-black transition-colors"
        >
          {equalSplit ? <ToggleRight size={28} className="text-black" /> : <ToggleLeft size={28} />}
        </motion.button>
      </div>

      {/* Recipient list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">
            Recipients ({recipients.length})
          </p>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowCsv((v) => !v)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-zinc-300"
            >
              <Upload size={13} />
              Import CSV
            </motion.button>
            <motion.button
              onClick={addRecipient}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium"
            >
              <Plus size={13} />
              Add
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {showCsv && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CsvImportPanel onImport={handleCsvImport} onClose={() => setShowCsv(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <RecipientList
          recipients={recipients}
          equalSplit={equalSplit}
          equalAmount={equalAmount}
          onUpdate={updateRecipient}
          onRemove={removeRecipient}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        onClick={handleSubmit}
        disabled={submitting}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? 'Creating split…' : 'Create Split'}
      </motion.button>

      <p className="text-xs text-center text-zinc-400">
        This creates payment rows in Supabase. Recipients pay via their connected GenLayer wallet.
      </p>
    </div>
  );
}
