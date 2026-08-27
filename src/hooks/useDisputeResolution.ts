'use client';

import { useState, useCallback } from 'react';
import { callDisputeResolution } from '@/lib/genlayerClient';
import { flagDispute, resolveDispute } from './useSplits';
import { useGenLayerWallet } from './useGenLayerWallet';

export interface DisputeState {
  isSubmitting: boolean;
  result: { fulfilled: boolean; reasoning: string } | null;
  error: string | null;
}

export function useDisputeResolution() {
  const { address } = useGenLayerWallet();
  const [state, setState] = useState<DisputeState>({
    isSubmitting: false,
    result: null,
    error: null,
  });

  const submitDispute = useCallback(
    async (
      splitMemberId: string,
      claimText: string,
      txnHash: string,
      expectedWallet: string,
      expectedAmountWei: bigint
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
        if (!address) {
          throw new Error('Wallet not connected');
        }
        const result = await callDisputeResolution(address, splitMemberId, claimText, txnHash, expectedWallet, expectedAmountWei);

        // Apply the finalized verdict to the split's real status — don't just display it
        await resolveDispute(splitMemberId, result.fulfilled);

        setState({ isSubmitting: false, result, error: null });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Dispute submission failed';
        setState({ isSubmitting: false, result: null, error: msg });
        return null;
      }
    },
    [address]
  );

  const reset = useCallback(() => {
    setState({ isSubmitting: false, result: null, error: null });
  }, []);

  return { ...state, submitDispute, reset };
}
