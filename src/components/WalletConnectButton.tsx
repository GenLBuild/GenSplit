'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut, RefreshCw, ChevronDown, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useGenLayerWallet } from '@/hooks/useGenLayerWallet';
import { shortenAddress } from '@/lib/format';

export function WalletConnectButton() {
  const {
    address,
    isConnected,
    balanceFormatted,
    isConnecting,
    isLoadingBalance,
    error,
    connect,
    disconnect,
    refreshBalance,
  } = useGenLayerWallet();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <motion.button
          onClick={connect}
          disabled={isConnecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-semibold text-sm border border-black hover:bg-zinc-900 transition-colors disabled:opacity-50"
        >
          {isConnecting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <RefreshCw size={16} />
            </motion.div>
          ) : (
            <Wallet size={16} />
          )}
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </motion.button>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-xs max-w-48 text-right"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setMenuOpen((o) => !o)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-2 rounded-xl text-sm font-medium hover:border-zinc-300 transition-all shadow-sm"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <div className="text-left">
          <p className="font-semibold text-zinc-900 text-xs">{shortenAddress(address!)}</p>
          <p className="text-zinc-500 text-xs flex items-center gap-1">
            {isLoadingBalance ? (
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                Loading…
              </motion.span>
            ) : (
              balanceFormatted
            )}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-zinc-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-zinc-100">
              <p className="text-xs text-zinc-500 mb-0.5">Connected Wallet</p>
              <p className="text-sm font-mono font-semibold text-zinc-900 truncate">{address}</p>
            </div>
            <div className="p-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy address'}
              </button>
              <button
                onClick={() => { refreshBalance(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
              >
                <RefreshCw size={14} />
                Refresh balance
              </button>
              <button
                onClick={() => { disconnect(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
