import Papa from 'papaparse';
import { isValidGenLayerAddress } from './validation';

export interface CSVRecipient {
  wallet: string;
  amount?: string;
  error?: string;
}

export interface CSVParseResult {
  recipients: CSVRecipient[];
  errors: string[];
  total: number;
  valid: number;
}

// Parse CSV for Split Bill — expected columns: wallet or wallet,amount
export function parseSplitCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const recipients: CSVRecipient[] = [];
        const errors: string[] = [];
        let valid = 0;

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i];
          if (!row || row.length === 0) continue;

          const wallet = (row[0] ?? '').trim();
          const amount = row[1] ? (row[1] as string).trim() : undefined;

          if (!wallet || wallet.toLowerCase() === 'wallet') {
            // skip header row
            continue;
          }

          if (!isValidGenLayerAddress(wallet)) {
            errors.push(`Row ${i + 1}: invalid GenLayer address "${wallet}"`);
            recipients.push({ wallet, amount, error: 'Invalid GenLayer address' });
          } else {
            if (amount !== undefined) {
              const num = parseFloat(amount);
              if (isNaN(num) || num <= 0) {
                errors.push(`Row ${i + 1}: invalid amount "${amount}"`);
                recipients.push({ wallet, amount, error: 'Invalid amount' });
              } else {
                recipients.push({ wallet, amount });
                valid++;
              }
            } else {
              recipients.push({ wallet });
              valid++;
            }
          }
        }

        resolve({ recipients, errors, total: recipients.length, valid });
      },
      error: (err) => {
        resolve({
          recipients: [],
          errors: [`Parse error: ${err.message}`],
          total: 0,
          valid: 0,
        });
      },
    });
  });
}

// Parse CSV for Bulk Payout — required columns: wallet,amount
export function parsePayoutCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const recipients: CSVRecipient[] = [];
        const errors: string[] = [];
        let valid = 0;

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i];
          if (!row || row.length < 2) {
            if (row && row.length > 0) {
              errors.push(`Row ${i + 1}: missing amount column`);
            }
            continue;
          }

          const wallet = (row[0] ?? '').trim();
          const amount = (row[1] ?? '').trim();

          if (!wallet || wallet.toLowerCase() === 'wallet') continue;

          const hasAddressError = !isValidGenLayerAddress(wallet);
          const num = parseFloat(amount);
          const hasAmountError = isNaN(num) || num <= 0;

          if (hasAddressError) {
            errors.push(`Row ${i + 1}: invalid GenLayer address "${wallet}"`);
            recipients.push({ wallet, amount, error: 'Invalid address' });
          } else if (hasAmountError) {
            errors.push(`Row ${i + 1}: invalid amount "${amount}"`);
            recipients.push({ wallet, amount, error: 'Invalid amount' });
          } else {
            recipients.push({ wallet, amount });
            valid++;
          }
        }

        resolve({ recipients, errors, total: recipients.length, valid });
      },
      error: (err) => {
        resolve({
          recipients: [],
          errors: [`Parse error: ${err.message}`],
          total: 0,
          valid: 0,
        });
      },
    });
  });
}
