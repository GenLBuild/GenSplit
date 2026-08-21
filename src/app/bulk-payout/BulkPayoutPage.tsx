'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendHorizonal, Upload, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { PayoutCsvImportPanel, type PayoutRecipient } from './PayoutCsvImportPanel';
import { PayoutForm } from './PayoutForm';

export function BulkPayoutPage() {
  const { isConnected, address, balanceWei, balanceFormatted } = useGenLayerWallet();
  const [recipients, setRecipients] = useState<PayoutRecipient[]>([]);
  const [showCsv, setShowCsv] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleCsvImport = (imported: PayoutRecipient[]) => {
    setRecipients((prev) => [...prev, ...imported]);
  };

  const handleAddManual = () => {
    setRecipients((prev) => [...prev, { id: crypto.randomUUID(), wallet: '', amount: '' }]);
  };

  const handleSuccess = () => {
    setSuccessCount(recipients.length);
    setRecipients([]);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Connect your wallet</h2>
          <p className="text-zinc-500 max-w-sm">Connect a GenLayer wallet to send bulk GEN payouts.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Bulk Payout</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Send GEN to multiple wallets at once — screened via Intelligent Contract.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm">
            <p className="text-zinc-500 text-xs">Your GEN Balance</p>
            <p className="font-black text-lg text-zinc-900">{balanceFormatted}</p>
          </div>
        </div>
      </motion.div>

      {/* Success */}
      <AnimatePresence>
        {successCount !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3"
          >
            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-emerald-900">Payout batch sent!</p>
              <p className="text-sm text-emerald-700">
                {successCount} GEN transfer{successCount !== 1 ? 's' : ''} processed on GenLayer testnet.
              </p>
            </div>
            <button
              onClick={() => setSuccessCount(null)}
              className="ml-auto text-emerald-600 text-sm underline"
            >
              New batch
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-zinc-900">Payout Recipients</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Addresses are screened via GenLayer Intelligent Contract before sending
            </p>
          </div>
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
              onClick={handleAddManual}
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <PayoutCsvImportPanel onImport={handleCsvImport} onClose={() => setShowCsv(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {recipients.length === 0 && !showCsv ? (
          <div className="py-12 flex flex-col items-center gap-3 border-2 border-dashed border-zinc-100 rounded-xl">
            <SendHorizonal size={28} className="text-zinc-300" />
            <p className="text-sm text-zinc-400">No recipients — import a CSV or add manually</p>
          </div>
        ) : (
          <PayoutForm
            recipients={recipients}
            onUpdateRecipients={setRecipients}
            fromAddress={address!}
            maxBalanceWei={balanceWei}
            onSuccess={handleSuccess}
          />
        )}
      </div>

      <p className="text-xs text-center text-zinc-400">
        All GEN transfers execute on GenLayer testnet (Asimov/Bradbury). Screening uses an Intelligent Contract.
      </p>
    </div>
  );
}
