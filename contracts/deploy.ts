/**
 * GenSplit Contract Deployment Script
 * 
 * Deploys dispute_resolution.py and payout_screening.py to GenLayer testnet.
 * 
 * Usage:
 *   npx ts-node contracts/deploy.ts
 * 
 * Prerequisites:
 * 1. Get testnet GEN from https://testnet-faucet.genlayer.foundation/ (100 GEN, every 7 days)
 * 2. Set GENLAYER_PRIVATE_KEY in .env
 * 3. Both contracts must be tested in GenLayer Studio first:
 *    https://studio.genlayer.com/contracts
 * 
 * After deploying, copy the contract addresses into .env:
 *   NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE=0x...
 *   NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING=0x...
 * 
 * Docs: https://docs.genlayer.com/developers/intelligent-contracts/deploying/deploy-scripts
 */

import { createClient, createAccount } from 'genlayer-js';
import { testnetAsimov } from 'genlayer-js/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function deploy() {
  const privateKey = process.env.GENLAYER_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('GENLAYER_PRIVATE_KEY not set in .env');
  }

  const account = createAccount(privateKey);
  const client = createClient({
    chain: testnetAsimov,
    account,
  });

  console.log('Deploying from address:', account.address);
  console.log('Network: testnet-asimov');

  // Read contract files
  const disputeCode = fs.readFileSync(
    path.join(__dirname, 'dispute_resolution.py'),
    'utf-8'
  );
  const screeningCode = fs.readFileSync(
    path.join(__dirname, 'payout_screening.py'),
    'utf-8'
  );

  // Deploy dispute_resolution.py
  console.log('\n1/2 Deploying dispute_resolution.py...');
  try {
    const disputeHash = await client.deployContract({
      code: disputeCode,
      args: [],
    });
    console.log('  Deploy tx hash:', disputeHash);
    // Note: For non-deterministic deployments, address is assigned by consensus
    // Check GenLayer Studio or explorer for the deployed address
    console.log('  Check https://explorer.genlayer.com for contract address');
  } catch (err) {
    console.error('  Deploy failed:', err);
  }

  // Deploy payout_screening.py
  console.log('\n2/2 Deploying payout_screening.py...');
  try {
    const screeningHash = await client.deployContract({
      code: screeningCode,
      args: [],
    });
    console.log('  Deploy tx hash:', screeningHash);
    console.log('  Check https://explorer.genlayer.com for contract address');
  } catch (err) {
    console.error('  Deploy failed:', err);
  }

  console.log('\nDone. After deployment:');
  console.log('1. Find contract addresses in GenLayer Studio or explorer');
  console.log('2. Add to .env:');
  console.log('   NEXT_PUBLIC_GENLAYER_CONTRACT_DISPUTE=0x...');
  console.log('   NEXT_PUBLIC_GENLAYER_CONTRACT_SCREENING=0x...');
}

deploy().catch(console.error);
