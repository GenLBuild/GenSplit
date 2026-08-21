# GenSplit

Dual-mode GEN payments app on GenLayer testnet — Split a Bill, Bulk Payout,
Requests, My Splits, Public Feed. Built with Next.js (App Router),
Supabase (off-chain indexing/UI cache), and GenLayerJS (wallet, transfers,
and two Intelligent Contracts).

## Stack
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (Postgres + Realtime)
- GenLayerJS SDK (wallet connect, GEN transfers, contract reads/writes)
- Two GenLayer Intelligent Contracts: `dispute_resolution.py`, `payout_screening.py`
- GitHub Actions cron agent (`agent/close-splits.ts`) — closes/expires splits every 5 min

## Local setup

```bash
npm install
cp .env.example .env
# fill in .env — see "Environment variables" below
npm run dev
```

## Environment variables

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `testnet-asimov` or `testnet-bradbury` |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | GenLayer network-configuration docs |
| `NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE` | address after deploying `contracts/dispute_resolution.py` |
| `NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING` | address after deploying `contracts/payout_screening.py` |

The GitHub Actions agent additionally needs these as **repo secrets** (not in `.env`):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service role, not anon — the agent
writes to `splits`).

## Database

Apply the migrations in `supabase/migrations/` to a real Supabase project
(SQL editor, or `supabase db push` with the CLI) before running the app.

## Intelligent Contracts

Write/test both contracts in [GenLayer Studio](https://studio.genlayer.com/contracts)
first, using its Read/Write Methods panel and Node Logs. Only after both behave
correctly there, deploy them (see `contracts/deploy.ts`) and put the resulting
addresses into `.env`.

## Deploy

Vercel (recommended for the Next.js app):
1. Push this repo to GitHub.
2. Import into Vercel, framework preset "Next.js".
3. Add all `NEXT_PUBLIC_*` env vars from the table above in Vercel project settings.
4. Deploy.

The GitHub Actions agent (`.github/workflows/agent.yml`) runs independently of
Vercel — it needs its two secrets set in the GitHub repo, not in Vercel.

## Known state

- Frontend, Supabase schema, and wallet/balance/transfer wiring are meant to work
  against a real Supabase project and real GenLayer testnet wallets — no mock data.
- Dispute submission and payout screening only work once both contracts are
  deployed and their addresses are set in `.env` — until then those two flows
  show a "not configured" state rather than faking success.
