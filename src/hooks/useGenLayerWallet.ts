'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBalance, getGenLayerClient, resetClient } from '@/lib/genlayerClient';
import { weiToGen } from '@/lib/format';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balanceWei: bigint;
  balanceFormatted: string;
  isConnecting: boolean;
  isLoadingBalance: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const STORAGE_KEY = 'gensplit_wallet_address';

export function useGenLayerWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint>(0n);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async (addr: string) => {
    setIsLoadingBalance(true);
    try {
      const bal = await getBalance(addr);
      setBalanceWei(bal);
    } catch (err) {
      console.error('[useGenLayerWallet] balance fetch error:', err);
      // Don't surface balance errors as blocking — just show 0
      setBalanceWei(0n);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAddress(stored);
      fetchBalance(stored);
    }
  }, [fetchBalance]);

  // Refresh balance every 30 seconds while connected
  useEffect(() => {
    if (!address) return;
    balanceIntervalRef.current = setInterval(() => {
      fetchBalance(address);
    }, 30_000);
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
    };
  }, [address, fetchBalance]);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const eth = (window as { ethereum?: { on: (event: string, handler: (accounts: string[]) => void) => void; removeListener: (event: string, handler: (accounts: string[]) => void) => void } }).ethereum;
    if (!eth) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setBalanceWei(0n);
        localStorage.removeItem(STORAGE_KEY);
        resetClient();
      } else {
        const newAddr = accounts[0];
        setAddress(newAddr);
        localStorage.setItem(STORAGE_KEY, newAddr);
        fetchBalance(newAddr);
      }
    };

    eth.on('accountsChanged', handleAccountsChanged);
    return () => eth.removeListener('accountsChanged', handleAccountsChanged);
  }, [fetchBalance]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const eth = (window as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      if (!eth) {
        throw new Error('No Ethereum wallet detected. Please install MetaMask or a compatible wallet.');
      }

      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const addr = accounts[0];
      setAddress(addr);
      localStorage.setItem(STORAGE_KEY, addr);

      // Initialize client with address
      getGenLayerClient(addr);

      // Fetch live balance
      await fetchBalance(addr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalanceWei(0n);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    resetClient();
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    await fetchBalance(address);
  }, [address, fetchBalance]);

  return {
    address,
    isConnected: !!address,
    balanceWei,
    balanceFormatted: `${weiToGen(balanceWei)} GEN`,
    isConnecting,
    isLoadingBalance,
    error,
    connect,
    disconnect,
    refreshBalance,
  };
}
