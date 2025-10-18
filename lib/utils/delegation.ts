"use client";

import { 
  createWalletClient,
  custom,
  type WalletClient,
  type Address,
  type Hash,
  encodeFunctionData,
  type PublicClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./monadChain";
import { CONTRACT_ADDRESS, validateMetaMaskWallet } from "./smartAccount";
import { MONAD_IRC_ABI } from "@/lib/contract/abi";

/**
 * Delegation utilities for creating and managing session keys
 * Uses MetaMask Smart Account for secure transaction execution
 * Session keys enable gasless signing without requiring MetaMask popups
 */

export interface DelegationConfig {
  allowedContracts: Address[];
  validUntil: number;
}

export interface SessionKeyData {
  address: Address;
  privateKey: `0x${string}`;
  validUntil: number;
  allowedContracts: Address[];
}

/**
 * Create a new session key (delegated signer)
 * This key will be authorized on-chain to sign transactions on behalf of the Smart Account
 */
export const createSessionKey = async (
  validityDurationMs: number = 30 * 60 * 1000
): Promise<SessionKeyData> => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  const validUntil = Math.floor((Date.now() + validityDurationMs) / 1000);

  return {
    address: account.address,
    privateKey,
    validUntil,
    allowedContracts: [CONTRACT_ADDRESS],
  };
};

/**
 * Authorize a session key on-chain via the Smart Account
 * This must be sent through the Smart Account (via bundler) so msg.sender is the Smart Account
 */
export const authorizeSessionKeyOnChain = async (
  sessionKeyData: SessionKeyData,
  smartAccountAddress: Address,
  smartAccount: any, // MetaMaskSmartAccount
  bundlerClient: any  // BundlerClient
): Promise<Hash | null> => {
  try {
    validateMetaMaskWallet();

    // Encode the authorizeSession function call
    const data = encodeFunctionData({
      abi: MONAD_IRC_ABI,
      functionName: "authorizeSession",
      args: [sessionKeyData.address, BigInt(sessionKeyData.validUntil)],
    });

    console.log("📤 Sending authorization user operation via bundler...");
    
    // Send transaction via Smart Account bundler so msg.sender is the Smart Account
    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [
        {
          to: CONTRACT_ADDRESS,
          data,
          value: BigInt(0),
        },
      ],
      maxFeePerGas: BigInt(200000000000), // 200 Gwei
      maxPriorityFeePerGas: BigInt(200000000000), // 200 Gwei
    });

    console.log("✅ User operation submitted! Hash:", userOpHash);
    console.log("⏳ Waiting for bundler to process (max 180s)...");

    // Wait for user operation to be included (with 180s timeout - increased for slow bundlers)
    try {
      const receipt = await Promise.race([
        bundlerClient.waitForUserOperationReceipt({ hash: userOpHash }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT")), 180000) // 180 seconds = 3 minutes
        )
      ]) as any;

      console.log("📋 Received receipt:", receipt);

      if (receipt && receipt.success) {
        console.log("✅ Authorization successful! Tx hash:", receipt.receipt.transactionHash);
        return receipt.receipt.transactionHash as Hash;
      }

      console.error("❌ Authorization failed. Receipt:", receipt);
      throw new Error("Transaction failed on-chain");
    } catch (timeoutError: any) {
      if (timeoutError.message === "TIMEOUT") {
        // Timeout occurred - transaction is still processing
        console.warn("⚠️ Bundler timeout - transaction may still be processing");
        const error: any = new Error("BUNDLER_TIMEOUT: Transaction submitted but bundler taking longer than expected");
        error.code = "BUNDLER_TIMEOUT";
        error.userOpHash = userOpHash; // Attach the user op hash to the error
        throw error;
      }
      throw timeoutError;
    }
  } catch (error) {
    console.error("❌ Failed to authorize session key:", error);
    throw error;
  }
};

/**
 * Create a wallet client from session key for signing
 * This client is used to sign transactions without MetaMask popups
 */
export const createSessionKeyWalletClient = (sessionKeyData: SessionKeyData): WalletClient => {
  validateMetaMaskWallet();
  
  const account = privateKeyToAccount(sessionKeyData.privateKey);
  
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: custom(window.ethereum!),
  });
};

/**
 * Check if a session key is still valid (not expired)
 */
export const isSessionKeyValid = (sessionKeyData: SessionKeyData): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return sessionKeyData.validUntil > now;
};

/**
 * Revoke a session key on-chain
 * This must be sent through the Smart Account (via bundler) so msg.sender is the Smart Account
 */
export const revokeSessionKeyOnChain = async (
  smartAccountAddress: Address,
  smartAccount: any, // MetaMaskSmartAccount
  bundlerClient: any  // BundlerClient
): Promise<Hash | null> => {
  try {
    validateMetaMaskWallet();

    const data = encodeFunctionData({
      abi: MONAD_IRC_ABI,
      functionName: "revokeSession",
      args: [],
    });

    // Send transaction via Smart Account bundler so msg.sender is the Smart Account
    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [
        {
          to: CONTRACT_ADDRESS,
          data,
          value: BigInt(0),
        },
      ],
      maxFeePerGas: BigInt(200000000000), // 200 Gwei
      maxPriorityFeePerGas: BigInt(200000000000), // 200 Gwei
    });

    // Wait for user operation to be included
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    if (receipt.success) {
      return receipt.receipt.transactionHash as Hash;
    }

    return null;
  } catch (error) {
    console.error("Failed to revoke session key:", error);
    throw error;
  }
};

/**
 * Get the nonce for a Smart Account from the contract
 */
export const getNonce = async (
  publicClient: PublicClient,
  smartAccountAddress: Address
): Promise<bigint> => {
  try {
    const nonce = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MONAD_IRC_ABI,
      functionName: "getNonce",
      args: [smartAccountAddress],
    });
    return nonce as bigint;
  } catch (error) {
    console.error("Failed to get nonce:", error);
    return BigInt(0);
  }
};
