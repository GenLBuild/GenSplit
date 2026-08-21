-- GenSplit schema — off-chain indexing only
-- GEN is the only token, so no token column anywhere
-- Source of truth for balances is always GenLayer, not this DB

create table if not exists splits (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('split', 'payout')),
  total_amount bigint not null,          -- base units of GEN (wei)
  creator_address text not null,         -- GenLayer address (lowercase)
  status text not null default 'active', -- active | closed | cancelled | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists split_members (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  wallet_address text not null,          -- GenLayer address (lowercase)
  amount_owed bigint not null,           -- base units of GEN (wei)
  paid boolean not null default false,
  invalid_address boolean not null default false,  -- also used to mark declined payments
  disputed boolean not null default false,
  txn_hash text,                         -- real GenLayer tx hash
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  split_member_id uuid not null references split_members(id) on delete cascade,
  txn_hash text not null,                -- real GenLayer tx hash
  amount bigint not null,                -- base units of GEN (wei)
  created_at timestamptz not null default now()
);

create table if not exists public_feed (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('split_created', 'payout_sent', 'split_closed')),
  amount bigint not null,                -- base units of GEN (wei)
  created_at timestamptz not null default now()
  -- no wallet address stored — anonymized by design
);

-- Indexes for common queries
create index if not exists idx_splits_creator on splits (creator_address);
create index if not exists idx_splits_status on splits (status);
create index if not exists idx_split_members_split_id on split_members (split_id);
create index if not exists idx_split_members_wallet on split_members (wallet_address);
create index if not exists idx_payments_member on payments (split_member_id);
create index if not exists idx_feed_created on public_feed (created_at desc);
