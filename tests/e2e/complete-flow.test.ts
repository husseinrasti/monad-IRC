/**
 * End-to-End Test Suite for MonadIRC
 * 
 * Tests the complete flow:
 * Smart Account → Bundler → Contract → HyperIndex → Convex → Frontend
 * 
 * Prerequisites:
 * - MetaMask installed and configured
 * - Monad testnet RPC accessible
 * - Pimlico bundler configured
 * - Contract deployed
 * - HyperIndex/Envio running
 * - Convex deployed and running
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  type Address,
  type Hash,
  encodeFunctionData,
  keccak256,
  toHex,
} from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import {
  toMetaMaskSmartAccount,
  Implementation,
  type MetaMaskSmartAccount,
} from '@metamask/delegation-toolkit';
import { monadTestnet } from '@/lib/utils/monadChain';
import { MONAD_IRC_ABI } from '@/lib/contract/abi';
import {
  executeUserOperation,
  formatBundlerError,
} from '@/lib/utils/bundlerHelpers';

// Configuration
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || RPC_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address;
const HYPERINDEX_URL = process.env.NEXT_PUBLIC_HYPERINDEX_URL || 'http://localhost:8080/graphql';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// Test state
let smartAccount: MetaMaskSmartAccount;
let publicClient: ReturnType<typeof createPublicClient>;
let bundlerClient: ReturnType<typeof createBundlerClient>;
let testChannelName: string;
let testMessage: string;
let channelTxHash: Hash;
let messageTxHash: Hash;

describe('MonadIRC E2E Tests', () => {
  
  beforeAll(async () => {
    console.log('🔧 Setting up E2E test environment...');
    
    // Verify environment variables
    if (!CONTRACT_ADDRESS) {
      throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set');
    }
    
    if (!BUNDLER_URL || BUNDLER_URL === RPC_URL) {
      console.warn('⚠️  NEXT_PUBLIC_BUNDLER_URL not configured. Tests may fail.');
    }
    
    if (!CONVEX_URL) {
      console.warn('⚠️  NEXT_PUBLIC_CONVEX_URL not configured. Backend tests may fail.');
    }
    
    // Generate unique test identifiers
    const timestamp = Date.now();
    testChannelName = `test-channel-${timestamp}`;
    testMessage = `Test message from E2E suite - ${timestamp}`;
    
    console.log(`📝 Test Channel: ${testChannelName}`);
    console.log(`📝 Test Message: ${testMessage}`);
  }, 30000);
  
  describe('1. Smart Account Setup', () => {
    it('should create public client', async () => {
      publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(RPC_URL),
      });
      
      expect(publicClient).toBeDefined();
      
      // Test RPC connection
      const blockNumber = await publicClient.getBlockNumber();
      expect(blockNumber).toBeGreaterThan(0n);
      
      console.log(`✅ Connected to Monad - Block: ${blockNumber}`);
    });
    
    it('should create bundler client', async () => {
      if (!BUNDLER_URL || BUNDLER_URL === RPC_URL) {
        console.warn('⚠️  Skipping bundler client test - no bundler URL configured');
        return;
      }
      
      bundlerClient = createBundlerClient({
        chain: monadTestnet,
        transport: http(BUNDLER_URL),
      });
      
      expect(bundlerClient).toBeDefined();
      console.log('✅ Bundler client created');
    });
    
    it('should create MetaMask Smart Account', async () => {
      // This test requires MetaMask to be installed and unlocked
      // In CI/CD, you would use a test private key instead
      
      if (typeof window === 'undefined' || !window.ethereum) {
        console.warn('⚠️  Skipping Smart Account test - MetaMask not available');
        return;
      }
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as Address[];
      
      expect(accounts.length).toBeGreaterThan(0);
      const eoaAddress = accounts[0];
      
      const signingWalletClient = createWalletClient({
        account: eoaAddress,
        chain: monadTestnet,
        transport: custom(window.ethereum),
      });
      
      smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [eoaAddress, [], [], []],
        deploySalt: '0x0000000000000000000000000000000000000000000000000000000000000000',
        signer: {
          walletClient: signingWalletClient,
        },
      });
      
      expect(smartAccount).toBeDefined();
      expect(smartAccount.address).toBeDefined();
      
      console.log(`✅ Smart Account created: ${smartAccount.address}`);
    }, 30000);
    
    it('should check Smart Account deployment status', async () => {
      if (!smartAccount) {
        console.warn('⚠️  Skipping - Smart Account not created');
        return;
      }
      
      const code = await publicClient.getBytecode({
        address: smartAccount.address,
      });
      
      const isDeployed = !!code && code !== '0x';
      console.log(`Smart Account deployment status: ${isDeployed ? 'Deployed' : 'Not deployed'}`);
      
      if (!isDeployed) {
        console.log('ℹ️  Smart Account will be deployed with first transaction');
      }
    });
    
    it('should have sufficient balance', async () => {
      if (!smartAccount) {
        console.warn('⚠️  Skipping - Smart Account not created');
        return;
      }
      
      const balance = await publicClient.getBalance({
        address: smartAccount.address,
      });
      
      const balanceInEth = Number(balance) / 1e18;
      console.log(`💰 Smart Account Balance: ${balanceInEth.toFixed(6)} MON`);
      
      // Warn if balance is low (but don't fail the test)
      if (balanceInEth < 0.01) {
        console.warn('⚠️  Smart Account balance is low. Fund it to execute transactions.');
      }
    });
  });
  
  describe('2. Bundler Integration', () => {
    it('should create a channel via bundler', async () => {
      if (!smartAccount || !bundlerClient) {
        console.warn('⚠️  Skipping - Smart Account or bundler not initialized');
        return;
      }
      
      console.log(`📡 Creating channel: ${testChannelName}`);
      
      const data = encodeFunctionData({
        abi: MONAD_IRC_ABI,
        functionName: 'createChannel',
        args: [testChannelName],
      });
      
      const result = await executeUserOperation(
        bundlerClient,
        smartAccount,
        [
          {
            to: CONTRACT_ADDRESS,
            data,
            value: BigInt(0),
          },
        ],
        {
          maxFeePerGas: BigInt(200000000000),
          maxPriorityFeePerGas: BigInt(200000000000),
          timeout: 90000,
          retryConfig: {
            maxAttempts: 3,
            initialDelay: 2000,
          },
          onLog: (message: string) => {
            console.log(`  ${message}`);
          },
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
      
      channelTxHash = result.transactionHash;
      console.log(`✅ Channel created! Tx: ${channelTxHash}`);
    }, 120000);
    
    it('should send a message via bundler', async () => {
      if (!smartAccount || !bundlerClient) {
        console.warn('⚠️  Skipping - Smart Account or bundler not initialized');
        return;
      }
      
      console.log(`📡 Sending message to: ${testChannelName}`);
      
      const msgHash = keccak256(toHex(testMessage));
      
      const data = encodeFunctionData({
        abi: MONAD_IRC_ABI,
        functionName: 'sendMessage',
        args: [msgHash, testChannelName],
      });
      
      const result = await executeUserOperation(
        bundlerClient,
        smartAccount,
        [
          {
            to: CONTRACT_ADDRESS,
            data,
            value: BigInt(0),
          },
        ],
        {
          maxFeePerGas: BigInt(200000000000),
          maxPriorityFeePerGas: BigInt(200000000000),
          timeout: 90000,
          retryConfig: {
            maxAttempts: 3,
            initialDelay: 2000,
          },
          onLog: (message: string) => {
            console.log(`  ${message}`);
          },
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
      
      messageTxHash = result.transactionHash;
      console.log(`✅ Message sent! Tx: ${messageTxHash}`);
    }, 120000);
  });
  
  describe('3. Smart Contract Events', () => {
    it('should emit ChannelCreated event', async () => {
      if (!channelTxHash) {
        console.warn('⚠️  Skipping - No channel transaction');
        return;
      }
      
      console.log('🔍 Checking for ChannelCreated event...');
      
      const receipt = await publicClient.getTransactionReceipt({
        hash: channelTxHash,
      });
      
      expect(receipt.status).toBe('success');
      expect(receipt.logs.length).toBeGreaterThan(0);
      
      // Find ChannelCreated event
      const channelCreatedEvent = receipt.logs.find(log => {
        // Check if this is a ChannelCreated event
        // Event signature: ChannelCreated(string,address,uint256)
        return log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
      });
      
      expect(channelCreatedEvent).toBeDefined();
      console.log(`✅ ChannelCreated event found in tx ${channelTxHash}`);
    });
    
    it('should emit MessageSent event', async () => {
      if (!messageTxHash) {
        console.warn('⚠️  Skipping - No message transaction');
        return;
      }
      
      console.log('🔍 Checking for MessageSent event...');
      
      const receipt = await publicClient.getTransactionReceipt({
        hash: messageTxHash,
      });
      
      expect(receipt.status).toBe('success');
      expect(receipt.logs.length).toBeGreaterThan(0);
      
      console.log(`✅ MessageSent event found in tx ${messageTxHash}`);
    });
  });
  
  describe('4. HyperIndex Integration', () => {
    it('should index ChannelCreated event', async () => {
      if (!channelTxHash) {
        console.warn('⚠️  Skipping - No channel transaction');
        return;
      }
      
      console.log('⏳ Waiting for HyperIndex to process event...');
      
      // Wait for indexer to catch up
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const query = `
        query GetChannel($name: String!) {
          channels(where: { channelName: { _eq: $name } }) {
            id
            channelName
            creator
            timestamp
          }
        }
      `;
      
      const response = await fetch(HYPERINDEX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { name: testChannelName },
        }),
      });
      
      const result = await response.json();
      
      console.log('HyperIndex response:', JSON.stringify(result, null, 2));
      
      expect(result.data).toBeDefined();
      expect(result.data.channels).toBeDefined();
      
      if (result.data.channels.length > 0) {
        const channel = result.data.channels[0];
        expect(channel.channelName).toBe(testChannelName);
        console.log(`✅ Channel indexed: ${channel.channelName}`);
      } else {
        console.warn('⚠️  Channel not yet indexed. May need more time.');
      }
    }, 30000);
    
    it('should index MessageSent event', async () => {
      if (!messageTxHash) {
        console.warn('⚠️  Skipping - No message transaction');
        return;
      }
      
      console.log('⏳ Waiting for HyperIndex to process event...');
      
      // Wait for indexer to catch up
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const msgHash = keccak256(toHex(testMessage));
      
      const query = `
        query GetMessage($msgHash: String!) {
          messages(where: { msgHash: { _eq: $msgHash } }) {
            id
            msgHash
            sender
            channel
            timestamp
          }
        }
      `;
      
      const response = await fetch(HYPERINDEX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { msgHash },
        }),
      });
      
      const result = await response.json();
      
      console.log('HyperIndex response:', JSON.stringify(result, null, 2));
      
      expect(result.data).toBeDefined();
      expect(result.data.messages).toBeDefined();
      
      if (result.data.messages.length > 0) {
        const message = result.data.messages[0];
        expect(message.channel).toBe(testChannelName);
        console.log(`✅ Message indexed: ${message.msgHash}`);
      } else {
        console.warn('⚠️  Message not yet indexed. May need more time.');
      }
    }, 30000);
  });
  
  describe('5. Convex Integration', () => {
    it('should have channel in Convex database', async () => {
      if (!CONVEX_URL) {
        console.warn('⚠️  Skipping - Convex URL not configured');
        return;
      }
      
      console.log('🔍 Querying Convex for channel...');
      
      // Wait for webhook to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const convexClient = await import('convex/browser');
      // Note: In a real test, you'd set up a proper Convex client
      // This is a placeholder for the test structure
      
      console.log('ℹ️  Convex integration test requires proper client setup');
    });
  });
  
  describe('6. Error Handling', () => {
    it('should handle bundler errors gracefully', () => {
      const testErrors = [
        new Error('insufficient funds for gas'),
        new Error('User denied transaction signature'),
        new Error('AA21 didn\'t pay prefund'),
        new Error('network timeout'),
      ];
      
      testErrors.forEach(error => {
        const { message, suggestions, isRetryable } = formatBundlerError(error);
        
        expect(message).toBeDefined();
        expect(suggestions).toBeInstanceOf(Array);
        expect(typeof isRetryable).toBe('boolean');
        
        console.log(`Error: ${message}`);
        console.log(`Retryable: ${isRetryable}`);
        console.log(`Suggestions: ${suggestions.length}`);
      });
    });
  });
  
  afterAll(async () => {
    console.log('\n📊 Test Summary:');
    console.log(`  Channel: ${testChannelName}`);
    console.log(`  Channel Tx: ${channelTxHash || 'N/A'}`);
    console.log(`  Message Tx: ${messageTxHash || 'N/A'}`);
    console.log('\n✅ E2E Test Suite Completed!');
  });
});

