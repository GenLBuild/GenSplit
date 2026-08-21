'use client';

import { useState, useCallback } from 'react';
import { callDisputeResolution } from '@/lib/genlayerClient';
import { flagDispute } from './useSplits';

export interface DisputeState {
  isSubmitting: boolean;
  result: { fulfilled: boolean; reasoning: string } | null;
  error: string | null;
}

export function useDisputeResolution() {
  const [state, setState] = useState<DisputeState>({
    isSubmitting: false,
    result: null,
    error: null,
  });

  const submitDispute = useCallback(
    async (
      splitMemberId: string,
      claimText: string,
      txnHash: string
    ): Promise<{ fulfilled: boolean; reasoning: string } | null> => {
      const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE;
      if (!contractAddress) {
        setState((s) => ({
          ...s,
          error: 'Dispute resolution contract not configured — deploy contract first and set NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE',
        }));
        return null;
      }

      setState({ isSubmitting: true, result: null, error: null });
      try {
        // Flag the dispute in Supabase
        await flagDispute(splitMemberId);

        // Call the GenLayer Intelligent Contract
        const result = await callDisputeResolution(splitMemberId, claimText, txnHash);

        setState({ isSubmitting: false, result, error: null });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Dispute submission failed';
        setState({ isSubmitting: false, result: null, error: msg });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ isSubmitting: false, result: null, error: null });
  }, []);

  return { ...state, submitDispute, reset };
}
