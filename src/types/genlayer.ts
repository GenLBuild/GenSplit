export interface GenLayerWallet {
  address: string;
  isConnected: boolean;
}

export interface GenLayerBalance {
  raw: bigint;
  formatted: string;
}

export interface DisputeResolutionResult {
  fulfilled: boolean;
  reasoning: string;
}

export interface PayoutScreeningResult {
  passed: boolean;
  flagged: string[];
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'accepted' | 'finalized' | 'failed';
}
