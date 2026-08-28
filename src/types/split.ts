export type SplitMode = 'split' | 'payout';
export type SplitStatus = 'active' | 'closed' | 'cancelled' | 'expired';

export interface Split {
  id: string;
  mode: SplitMode;
  total_amount: bigint;
  creator_address: string;
  status: SplitStatus;
  created_at: string;
  expires_at: string | null;
  members?: SplitMember[];
}

export interface SplitMember {
  id: string;
  split_id: string;
  wallet_address: string;
  amount_owed: bigint;
  paid: boolean;
  payment_status: 'pending' | 'confirming' | 'paid';
  invalid_address: boolean; // reused to mark declined payments
  disputed: boolean;
  txn_hash: string | null;
  created_at: string;
}

export interface CreateSplitInput {
  mode: SplitMode;
  total_amount: bigint;
  creator_address: string;
  expires_at?: string;
  recipients: Array<{
    wallet_address: string;
    amount_owed: bigint;
  }>;
}

export interface PublicFeedEvent {
  id: string;
  event_type: 'split_created' | 'payout_sent' | 'split_closed';
  amount: bigint;
  created_at: string;
}
