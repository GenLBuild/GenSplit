'use client';

import { useState, useCallback } from 'react';
import { callDisputeResolution } from '@/lib/genlayerClient';
import { resolveDispute } from './useSplits';
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
        // Call the GenLayer Intelligent Contract — don't flag as disputed until it
        // actually succeeds, so a failed/rejected transaction doesn't leave the
        // row stuck in a permanent "disputed" state with no way to retry.
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
