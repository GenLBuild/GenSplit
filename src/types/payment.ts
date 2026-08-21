export interface Payment {
  id: string;
  split_member_id: string;
  txn_hash: string;
  amount: bigint;
  created_at: string;
}

export interface PaymentRequest {
  split_member_id: string;
  wallet_address: string;
  amount_owed: bigint;
  split_id: string;
  split_mode: 'split' | 'payout';
  creator_address: string;
  paid: boolean;
  txn_hash: string | null;
  created_at: string;
}
