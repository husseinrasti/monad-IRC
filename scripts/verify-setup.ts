/**
 * Quick Setup Verification Script
 * 
 * Run this to verify your MonadIRC setup is correct
 * Usage: npx tsx scripts/verify-setup.ts
 */

import { createPublicClient, http } from 'viem';
import { monadTestnet } from '../lib/utils/monadChain';

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const HYPERINDEX_URL = process.env.NEXT_PUBLIC_HYPERINDEX_URL;

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function log(result: CheckResult) {
  results.push(result);
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.name}: ${result.message}`);
}

async function verify() {
  console.log('🔍 Verifying MonadIRC Setup...\n');
  
  // 1. Check environment variables
  console.log('1️⃣  Environment Variables');
  
  if (CONTRACT_ADDRESS && CONTRACT_ADDRESS.match(/^0x[a-fA-F0-9]{40}$/)) {
    log({
      name: 'Contract Address',
      status: 'pass',
      message: `Set to ${CONTRACT_ADDRESS}`,
    });
  } else {
    log({
      name: 'Contract Address',
      status: 'fail',
      message: 'NEXT_PUBLIC_CONTRACT_ADDRESS is not set or invalid',
    });
  }
  
  if (BUNDLER_URL && !BUNDLER_URL.includes('YOUR_API_KEY')) {
    log({
      name: 'Bundler URL',
      status: 'pass',
      message: 'Configured',
    });
  } else {
    log({
      name: 'Bundler URL',
      status: 'fail',
      message: 'NEXT_PUBLIC_BUNDLER_URL not configured. Account abstraction will not work!',
    });
  }
  
  if (CONVEX_URL && !CONVEX_URL.includes('your-deployment')) {
    log({
      name: 'Convex URL',
      status: 'pass',
      message: 'Configured',
    });
  } else {
    log({
      name: 'Convex URL',
      status: 'warn',
      message: 'NEXT_PUBLIC_CONVEX_URL not configured',
    });
  }
  
  if (HYPERINDEX_URL) {
    log({
      name: 'HyperIndex URL',
      status: 'pass',
      message: `Set to ${HYPERINDEX_URL}`,
    });
  } else {
    log({
      name: 'HyperIndex URL',
      status: 'warn',
      message: 'NEXT_PUBLIC_HYPERINDEX_URL not set',
    });
  }
  
  // 2. Check RPC connection
  console.log('\n2️⃣  Blockchain Connection');
  
  try {
    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(RPC_URL),
    });
    
    const blockNumber = await publicClient.getBlockNumber();
    log({
      name: 'Monad RPC',
      status: 'pass',
      message: `Connected! Latest block: ${blockNumber}`,
    });
  } catch (error) {
    log({
      name: 'Monad RPC',
      status: 'fail',
      message: `Cannot connect to ${RPC_URL}`,
    });
  }
  
  // 3. Check contract
  console.log('\n3️⃣  Smart Contract');
  
  if (CONTRACT_ADDRESS) {
    try {
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(RPC_URL),
      });
      
      const code = await publicClient.getBytecode({
        address: CONTRACT_ADDRESS as `0x${string}`,
      });
      
      if (code && code !== '0x') {
        log({
          name: 'Contract Deployed',
          status: 'pass',
          message: 'Contract code found at address',
        });
      } else {
        log({
          name: 'Contract Deployed',
          status: 'fail',
          message: 'No contract code at specified address',
        });
      }
    } catch (error) {
      log({
        name: 'Contract Deployed',
        status: 'fail',
        message: 'Failed to check contract deployment',
      });
    }
  }
  
  // 4. Check Convex
  console.log('\n4️⃣  Convex Backend');
  
  if (CONVEX_URL) {
    try {
      const healthResponse = await fetch(`${CONVEX_URL}/api/health`, {
        method: 'GET',
      });
      
      if (healthResponse.ok) {
        log({
          name: 'Convex Health',
          status: 'pass',
          message: 'Convex backend is healthy',
        });
      } else {
        log({
          name: 'Convex Health',
          status: 'warn',
          message: 'Convex health check returned non-200',
        });
      }
    } catch (error) {
      log({
        name: 'Convex Health',
        status: 'warn',
        message: 'Cannot reach Convex backend',
      });
    }
  }
  
  // 5. Check HyperIndex
  console.log('\n5️⃣  HyperIndex/Envio');
  
  if (HYPERINDEX_URL) {
    try {
      const introspectionQuery = `
        {
          __schema {
            types {
              name
            }
          }
        }
      `;
      
      const response = await fetch(HYPERINDEX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: introspectionQuery }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          log({
            name: 'HyperIndex GraphQL',
            status: 'pass',
            message: 'GraphQL endpoint is accessible',
          });
        } else {
          log({
            name: 'HyperIndex GraphQL',
            status: 'warn',
            message: 'GraphQL endpoint returned unexpected response',
          });
        }
      } else {
        log({
          name: 'HyperIndex GraphQL',
          status: 'warn',
          message: 'Cannot access HyperIndex endpoint',
        });
      }
    } catch (error) {
      log({
        name: 'HyperIndex GraphQL',
        status: 'warn',
        message: 'HyperIndex not running or not accessible',
      });
    }
  }
  
  // 6. Summary
  console.log('\n📊 Summary');
  console.log('─'.repeat(50));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log('─'.repeat(50));
  
  if (failed > 0) {
    console.log('\n❌ Setup verification failed. Please fix the issues above.');
    console.log('\nRefer to ENV_TEMPLATE.md for configuration help.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Setup has warnings. Some features may not work correctly.');
    console.log('Consider fixing the warnings for full functionality.');
  } else {
    console.log('\n✅ All checks passed! Your setup is ready.');
  }
}

verify().catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});

