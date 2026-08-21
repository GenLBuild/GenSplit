'use client';

import { useState, useCallback } from 'react';
import { callPayoutScreening } from '@/lib/genlayerClient';

export interface ScreeningState {
  isScreening: boolean;
  result: { passed: boolean; flagged: string[] } | null;
  error: string | null;
}

export function usePayoutScreening() {
  const [state, setState] = useState<ScreeningState>({
    isScreening: false,
    result: null,
    error: null,
  });

  const screenAddresses = useCallback(
    async (walletAddresses: string[]): Promise<{ passed: boolean; flagged: string[] } | null> => {
      const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING;
      if (!contractAddress) {
        setState((s) => ({
          ...s,
          error: 'Payout screening contract not configured — deploy contract first and set NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING',
        }));
        return null;
      }

      if (walletAddresses.length === 0) {
        return { passed: true, flagged: [] };
      }

      setState({ isScreening: true, result: null, error: null });
      try {
        const result = await callPayoutScreening(walletAddresses);
        setState({ isScreening: false, result, error: null });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Screening failed';
        setState({ isScreening: false, result: null, error: msg });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ isScreening: false, result: null, error: null });
  }, []);

  return { ...state, screenAddresses, reset };
}
