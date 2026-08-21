// GenLayer address validation
// GenLayer uses Ethereum-compatible 0x-prefixed hex addresses

export function isValidGenLayerAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function validateGENAmount(amount: string): { valid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Amount is required' };
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' };
  }
  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (num > 1_000_000_000) {
    return { valid: false, error: 'Amount too large' };
  }
  // Check decimal places <= 18
  const parts = amount.split('.');
  if (parts[1] && parts[1].length > 18) {
    return { valid: false, error: 'Too many decimal places (max 18)' };
  }
  return { valid: true };
}
