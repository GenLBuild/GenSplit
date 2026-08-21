// All amounts are stored as base units of GEN (bigint)
// This file handles conversion for display only

const GEN_DECIMALS = 18;
const ONE_GEN = BigInt(10 ** GEN_DECIMALS);

export function weiToGen(wei: bigint): string {
  if (wei === 0n) return '0';
  const whole = wei / ONE_GEN;
  const fractional = wei % ONE_GEN;
  if (fractional === 0n) return whole.toString();
  const fracStr = fractional.toString().padStart(GEN_DECIMALS, '0').replace(/0+$/, '');
  const trimmed = fracStr.slice(0, 6); // max 6 decimal places for display
  return `${whole}.${trimmed}`;
}

export function genToWei(gen: string): bigint {
  if (!gen || gen === '0') return 0n;
  const [whole, frac = ''] = gen.split('.');
  const fracPadded = frac.padEnd(GEN_DECIMALS, '0').slice(0, GEN_DECIMALS);
  return BigInt(whole || '0') * ONE_GEN + BigInt(fracPadded || '0');
}

export function formatGEN(wei: bigint, showSymbol = true): string {
  const display = weiToGen(wei);
  return showSymbol ? `${display} GEN` : display;
}

export function formatGENCompact(wei: bigint): string {
  const gen = Number(wei) / Number(ONE_GEN);
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(2)}K GEN`;
  return `${gen.toFixed(4)} GEN`;
}

// Normalize a GenLayer address for display (@nametag style short form)
export function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.startsWith('0x') && address.length >= 10) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }
  return address;
}

// Format a date nicely
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Parse bigint from DB (stored as number in Supabase JSON)
export function toBigInt(value: number | bigint | string | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  return BigInt(value);
}
