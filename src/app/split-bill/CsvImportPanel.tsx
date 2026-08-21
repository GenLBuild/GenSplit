'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { parseSplitCSV, type CSVParseResult } from '@/lib/csv';
import type { Recipient } from './RecipientList';

interface CsvImportPanelProps {
  onImport: (recipients: Recipient[]) => void;
  onClose: () => void;
}

export function CsvImportPanel({ onImport, onClose }: CsvImportPanelProps) {
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<CSVParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setResult({
        recipients: [],
        errors: ['File must be a .csv file'],
        total: 0,
        valid: 0,
      });
      return;
    }
    setParsing(true);
    const parsed = await parseSplitCSV(file);
    setResult(parsed);
    setParsing(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await parseFile(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await parseFile(file);
  };

  const handleImport = () => {
    if (!result) return;
    const validRecipients: Recipient[] = result.recipients
      .filter((r) => !r.error)
      .map((r) => ({
        id: crypto.randomUUID(),
        wallet: r.wallet,
        amount: r.amount ?? '',
      }));
    onImport(validRecipients);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-zinc-200 rounded-2xl p-5 bg-white space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">Import from CSV</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400">
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Expected columns: <code className="bg-zinc-100 px-1 py-0.5 rounded">wallet</code> or{' '}
        <code className="bg-zinc-100 px-1 py-0.5 rounded">wallet,amount</code> — one row per recipient, no header required.
        Amount in GEN (decimal, e.g., <code className="bg-zinc-100 px-1 py-0.5 rounded">1.5</code>).
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          dragging ? 'border-black bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {parsing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <FileText size={24} className="text-zinc-400" />
          </motion.div>
        ) : (
          <Upload size={24} className="text-zinc-400" />
        )}
        <p className="text-sm text-zinc-600 font-medium">
          {parsing ? 'Parsing…' : 'Drop CSV file here or click to browse'}
        </p>
        <p className="text-xs text-zinc-400">Only .csv files accepted</p>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              {result.valid > 0 ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <AlertCircle size={16} className="text-red-500" />
              )}
              <p className="text-sm font-medium">
                <span className="text-emerald-600">{result.valid} valid</span>
                {result.errors.length > 0 && (
                  <span className="text-red-500 ml-2">{result.errors.length} errors</span>
                )}
                <span className="text-zinc-400 ml-2">of {result.total} rows</span>
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}

            {result.recipients.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.error ? (
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                )}
                <span className="font-mono text-zinc-600 truncate">{r.wallet}</span>
                {r.amount && <span className="text-zinc-400">{r.amount} GEN</span>}
              </div>
            ))}
            {result.recipients.length > 5 && (
              <p className="text-xs text-zinc-400">…and {result.recipients.length - 5} more rows</p>
            )}

            {result.valid > 0 && (
              <motion.button
                onClick={handleImport}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Import {result.valid} recipients
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
