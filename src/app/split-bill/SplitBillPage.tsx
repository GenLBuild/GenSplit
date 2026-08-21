'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { CreateSplitForm } from './CreateSplitForm';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { ShareLinkButton } from '@/components/ShareLinkButton';

export function SplitBillPage() {
  const { isConnected, address } = useGenLayerWallet();
  const [createdSplitId, setCreatedSplitId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreated = (splitId: string) => {
    setCreatedSplitId(splitId);
    setShowForm(false);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Connect your wallet</h2>
          <p className="text-zinc-500 max-w-sm">
            Connect a GenLayer-compatible wallet to create and manage splits.
          </p>
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Split a Bill</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Request GEN from multiple people — track who paid in real time.
          </p>
        </div>
        {!showForm && (
          <motion.button
            onClick={() => { setShowForm(true); setCreatedSplitId(null); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
          >
            <Plus size={16} />
            New Split
          </motion.button>
        )}
      </motion.div>

      {/* Success banner */}
      <AnimatePresence>
        {createdSplitId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-emerald-900">Split created successfully!</p>
                  <p className="text-sm text-emerald-700">
                    Share the link below so recipients can pay their share.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareLinkButton splitId={createdSplitId} />
                <motion.button
                  onClick={() => { setCreatedSplitId(null); setShowForm(true); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Plus size={14} />
                  New
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <CreateSplitForm
              creatorAddress={address!}
              onCreated={handleCreated}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state when no form is open */}
      {!showForm && !createdSplitId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl"
        >
          <div className="text-center space-y-3">
            <p className="text-zinc-400 text-sm">No active split being created</p>
            <motion.button
              onClick={() => setShowForm(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl font-semibold text-sm mx-auto"
            >
              <Plus size={16} />
              Create a Split
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
