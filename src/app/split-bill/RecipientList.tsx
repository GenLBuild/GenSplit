'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertCircle } from 'lucide-react';
import { AddressValidator } from '@/components/AddressValidator';
import { isValidGenLayerAddress } from '@/lib/validation';

export interface Recipient {
  id: string;
  wallet: string;
  amount: string;
}

interface RecipientListProps {
  recipients: Recipient[];
  equalSplit: boolean;
  equalAmount: string;
  onUpdate: (id: string, field: 'wallet' | 'amount', value: string) => void;
  onRemove: (id: string) => void;
}

export function RecipientList({
  recipients,
  equalSplit,
  equalAmount,
  onUpdate,
  onRemove,
}: RecipientListProps) {
  if (recipients.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-xl">
        <AlertCircle size={24} className="text-zinc-300 mb-2" />
        <p className="text-sm text-zinc-400">No recipients added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 px-1">
        <p className="col-span-7 text-xs font-medium text-zinc-500">Wallet Address</p>
        <p className="col-span-3 text-xs font-medium text-zinc-500">Amount (GEN)</p>
        <p className="col-span-2 text-xs font-medium text-zinc-500 text-right">Remove</p>
      </div>
      <AnimatePresence initial={false}>
        {recipients.map((recipient, idx) => (
          <motion.div
            key={recipient.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            className="grid grid-cols-12 gap-2 items-start"
          >
            <div className="col-span-7">
              <AddressValidator
                value={recipient.wallet}
                onChange={(v) => onUpdate(recipient.id, 'wallet', v)}
                placeholder="0x…"
              />
            </div>
            <div className="col-span-3">
              <input
                type="number"
                min="0"
                step="any"
                value={equalSplit ? equalAmount : recipient.amount}
                onChange={(e) => onUpdate(recipient.id, 'amount', e.target.value)}
                disabled={equalSplit}
                placeholder="0.00"
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-zinc-200 focus:border-zinc-400 outline-none disabled:bg-zinc-50 disabled:text-zinc-400 transition-colors"
              />
            </div>
            <div className="col-span-2 flex justify-end pt-1">
              <motion.button
                onClick={() => onRemove(recipient.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Validation summary */}
      {recipients.some((r) => r.wallet && !isValidGenLayerAddress(r.wallet)) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-500 flex items-center gap-1 pt-1"
        >
          <AlertCircle size={12} />
          Some addresses are invalid — fix them before creating the split
        </motion.p>
      )}
    </div>
  );
}
