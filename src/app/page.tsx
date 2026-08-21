'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Split, SendHorizonal, Inbox, LayoutGrid, Globe } from 'lucide-react';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { SplitBillPage } from './split-bill/SplitBillPage';
import { BulkPayoutPage } from './bulk-payout/BulkPayoutPage';
import { RequestsPage } from './requests/RequestsPage';
import { MySplitsPage } from './my-splits/MySplitsPage';
import { PublicFeedPage } from './public-feed/PublicFeedPage';

type Tab = 'split-bill' | 'bulk-payout' | 'requests' | 'my-splits' | 'public-feed';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'split-bill', label: 'Split a Bill', icon: <Split size={16} />, description: 'Request GEN from multiple wallets' },
  { id: 'bulk-payout', label: 'Bulk Payout', icon: <SendHorizonal size={16} />, description: 'Send GEN to multiple addresses' },
  { id: 'requests', label: 'Requests', icon: <Inbox size={16} />, description: 'Your incoming payment requests' },
  { id: 'my-splits', label: 'My Splits', icon: <LayoutGrid size={16} />, description: 'Splits & payouts you created' },
  { id: 'public-feed', label: 'Public Feed', icon: <Globe size={16} />, description: 'Live on-chain activity' },
];

// Animated background grid
function GridBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.025]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="black" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 left-16 w-96 h-96 rounded-full bg-gradient-to-br from-zinc-100 to-transparent blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-gradient-to-tl from-zinc-100 to-transparent blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  );
}

// Animated ticker text
function Ticker() {
  const items = [
    'Split bills on GenLayer',
    'Bulk GEN payouts in seconds',
    'On-chain dispute resolution',
    'Real-time payment tracking',
    'Intelligent Contract screening',
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx((i) => (i + 1) % items.length), 3000);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="h-5 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs text-zinc-500"
        >
          {items[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('split-bill');

  return (
    <div className="relative min-h-screen bg-white">
      <GridBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-100 bg-white/90 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-black text-lg tracking-tight text-black">
                  Gen<span className="font-light">Split</span>
                </h1>
                <Ticker />
              </div>
            </motion.div>

            {/* Wallet */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <WalletConnectButton />
            </motion.div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 pb-0 -mb-px overflow-x-auto scrollbar-hide">
            {TABS.map((tab, i) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-black'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'split-bill' && <SplitBillPage />}
            {activeTab === 'bulk-payout' && <BulkPayoutPage />}
            {activeTab === 'requests' && <RequestsPage />}
            {activeTab === 'my-splits' && <MySplitsPage />}
            {activeTab === 'public-feed' && <PublicFeedPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-100 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Zap size={14} />
            <span>GenSplit — Powered by GenLayer Intelligent Contracts</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              GenLayer Docs
            </a>
            <a
              href="https://testnet-faucet.genlayer.foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Get Testnet GEN
            </a>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              GenLayer Studio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
