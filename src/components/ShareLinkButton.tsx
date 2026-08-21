'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Check, Link } from 'lucide-react';

interface ShareLinkButtonProps {
  splitId: string;
  className?: string;
}

export function ShareLinkButton({ splitId, className = '' }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${splitId}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'GenSplit Payment Request',
          text: 'You have a payment request on GenSplit',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // User cancelled share or clipboard failed
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-all ${className}`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-emerald-600"
          >
            <Check size={14} />
            Copied!
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Share2 size={14} />
            Share Link
          </motion.span>
        )}
      </AnimatePresence>
      {!copied && (
        <span className="text-xs text-zinc-400 font-mono truncate max-w-24">
          <Link size={10} className="inline mr-1" />
          /join/{splitId.slice(0, 8)}…
        </span>
      )}
    </motion.button>
  );
}
