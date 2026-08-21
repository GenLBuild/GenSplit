'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { isValidGenLayerAddress } from '@/lib/validation';

interface AddressValidatorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function AddressValidator({
  value,
  onChange,
  placeholder = '0x… GenLayer address',
  label,
  disabled,
  className = '',
}: AddressValidatorProps) {
  const isValid = value.length > 0 && isValidGenLayerAddress(value);
  const isInvalid = value.length > 0 && !isValidGenLayerAddress(value);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-xs font-medium text-zinc-600">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full font-mono text-sm px-3 py-2.5 pr-10 rounded-lg border transition-all outline-none
            ${isValid ? 'border-emerald-400 bg-emerald-50/50 focus:border-emerald-500' : ''}
            ${isInvalid ? 'border-red-400 bg-red-50/50 focus:border-red-500' : ''}
            ${!isValid && !isInvalid ? 'border-zinc-200 bg-white focus:border-zinc-400' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <AnimatePresence>
          {isValid && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Check size={16} className="text-emerald-500" />
            </motion.div>
          )}
          {isInvalid && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={16} className="text-red-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {isInvalid && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 text-xs text-red-500"
          >
            <AlertCircle size={12} />
            Must be a valid GenLayer address (0x + 40 hex chars)
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
