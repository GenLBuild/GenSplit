'use client';

// GenLayerJS SDK — single init file
// This is the ONLY file that imports genlayer-js
// Handles: wallet connect, balance reads, GEN value transfers, and both contract calls

import { createClient } from 'genlayer-js';
import { testnetAsimov, testnetBradbury, localnet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

type GenLayerClientInstance = ReturnType<typeof createClient>;

let clientInstance: GenLayerClientInstance | null = null;
let currentAddress: string | null = null;

function getChain() {
  const network = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? 'testnet-asimov';
  if (network === 'testnet-bradbury') return testnetBradbury;
  if (network === 'localnet') return localnet;
  return testnetAsimov;
}

// Exposes the wallet_addEthereumChain params for MetaMask — hardcoded to the
// chain your contracts are actually deployed on (confirmed via GenLayer Studio).
export function getWalletChainParams() {
  return {
    chainId: '0x107d', // 4221 in hex
    chainName: 'GenLayer Testnet Chain',
    rpcUrls: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://rpc.testnet-chain.genlayer.com'],
    nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
    blockExplorerUrls: ['https://explorer.testnet-chain.genlayer.com'],
  };
}

export function getGenLayerClient(address?: string): GenLayerClientInstance {
  if (clientInstance && (!address || address === currentAddress)) {
    return clientInstance;
  }

  const chain = getChain();
  const config: Parameters<typeof createClient>[0] = { chain };

  if (address) {
    currentAddress = address;
    config.account = address as `0x${string}`;
  }

  const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;
  if (rpcUrl) {
    config.endpoint = rpcUrl;
  }

  clientInstance = createClient(config);
  return clientInstance;
}

// GenLayer encodes a write call's JSON return value inside receipt.eqBlocksOutputs
// as a hex string with binary framing bytes around the actual JSON payload.
// There's no clean typed field for it yet, so extract the JSON substring directly.
function decodeEqBlocksOutputs(hexOrBytes: unknown): unknown {
  try {
    const hex = typeof hexOrBytes === 'string' ? hexOrBytes.replace(/^0x/, '') : '';
    if (!hex) return null;
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;
    return JSON.parse(text.substring(start, end + 1));
  } catch {
    return null;
  }
}

export function resetClient(): void {
  clientInstance = null;
  currentAddress = null;
}

// Get the live GEN balance for an address (in wei / base units)
export async function getBalance(address: string): Promise<bigint> {
  const client = getGenLayerClient(address);
  try {
    const balance = await client.getBalance({ address: address as `0x${string}` });
    return balance;
  } catch (err) {
    console.error('[genlayerClient] getBalance error:', err);
    throw err;
  }
}

// Send a native GEN transfer — returns tx hash
export async function sendGEN(
  fromAddress: string,
  toAddress: string,
  amountWei: bigint
): Promise<string> {
  const client = getGenLayerClient(fromAddress);
  try {
    const hash = await client.sendTransaction({
      to: toAddress as `0x${string}`,
      value: amountWei,
      account: fromAddress as `0x${string}`,
    });
    // Wait for real on-chain acceptance before this counts as a success
    await client.waitForTransactionReceipt({
      hash: hash as any,
      status: TransactionStatus.ACCEPTED,
      retries: 60,
      interval: 5000,
    });
    return hash as string;
  } catch (err) {
    console.error('[genlayerClient] sendGEN error:', err);
    throw err;
  }
}

// Call dispute_resolution contract — returns result via readContract
export async function callDisputeResolution(
  fromAddress: string,
  splitMemberId: string,
  claimText: string,
  txnHash: string,
  expectedWallet: string,
  expectedAmountWei: bigint
): Promise<{ fulfilled: boolean; reasoning: string }> {
  const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE;
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE is not configured');
  }

  const client = getGenLayerClient(fromAddress);
  const hash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'resolve_dispute',
    args: [splitMemberId, claimText, txnHash, expectedWallet, expectedAmountWei.toString()],
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 100, interval: 5000 });
  const decoded = decodeEqBlocksOutputs((receipt as unknown as { eqBlocksOutputs?: string }).eqBlocksOutputs);
  return (decoded ?? { fulfilled: false, reasoning: 'Could not decode contract response' }) as { fulfilled: boolean; reasoning: string };
}

// Write to dispute_resolution contract (submits evidence via a state-changing call)
export async function writeDisputeResolution(
  fromAddress: string,
  splitMemberId: string,
  claimText: string,
  txnHash: string
): Promise<string> {
  const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE;
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE is not configured');
  }

  const client = getGenLayerClient(fromAddress);
  const hash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'resolve_dispute',
    args: [splitMemberId, claimText, txnHash],
    value: 0n,
  });

  return hash as string;
}

// Send GEN to many recipients in ONE signed transaction via the batch payout contract
export async function batchSendGEN(
  fromAddress: string,
  recipients: string[],
  amountsWei: bigint[]
): Promise<{ hash: string; success: boolean; sent: string[] }> {
  const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_BATCHPAYOUT;
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_BATCHPAYOUT is not configured');
  }
  const totalWei = amountsWei.reduce((sum, a) => sum + a, 0n);
  const client = getGenLayerClient(fromAddress);
  const hash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'batch_send',
    args: [recipients, amountsWei.map((a) => a.toString())],
    value: totalWei,
  });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 60, interval: 5000 });
  const statusName = (receipt as unknown as { status_name?: string }).status_name;
  const success = statusName === 'ACCEPTED' || statusName === 'FINALIZED';
  return { hash: hash as string, success, sent: success ? recipients : [] };
}

// Call payout_screening contract — screens a batch of addresses
export async function callPayoutScreening(
  fromAddress: string,
  walletAddresses: string[]
): Promise<{ passed: boolean; flagged: string[] }> {
  const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING;
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING is not configured');
  }

  const client = getGenLayerClient(fromAddress);
  const hash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'screen_payout',
    args: [walletAddresses],
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 100, interval: 5000 });
  const decoded = decodeEqBlocksOutputs((receipt as unknown as { eqBlocksOutputs?: string }).eqBlocksOutputs) as
    | { passed: boolean; flagged: string[] }
    | null;
  // Fail closed — if we can't decode the contract's answer, treat it as blocked, not clear
  if (!decoded) {
    throw new Error('Could not decode screening result from GenLayer — send blocked for safety.');
  }
  return decoded;
}
