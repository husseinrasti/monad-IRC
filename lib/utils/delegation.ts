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
 * This requires a MetaMask transaction to authorize the session key
 */
export const authorizeSessionKeyOnChain = async (
  sessionKeyData: SessionKeyData,
  smartAccountAddress: Address
): Promise<Hash | null> => {
  try {
    validateMetaMaskWallet();

    const walletClient = createWalletClient({
      chain: monadTestnet,
      transport: custom(window.ethereum!),
    });
    
    // Get accounts from wallet client
    const [account] = await walletClient.getAddresses();

    // Encode the authorizeSession function call
    const data = encodeFunctionData({
      abi: MONAD_IRC_ABI,
      functionName: "authorizeSession",
      args: [sessionKeyData.address, BigInt(sessionKeyData.validUntil)],
    });

    // Send transaction via MetaMask to authorize the session key
    const hash = await walletClient.sendTransaction({
      to: CONTRACT_ADDRESS,
      data,
      account,
      chain: monadTestnet,
    });

    return hash;
  } catch (error) {
    console.error("Failed to authorize session key:", error);
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
 * This requires a MetaMask transaction
 */
export const revokeSessionKeyOnChain = async (
  smartAccountAddress: Address
): Promise<Hash | null> => {
  try {
    validateMetaMaskWallet();

    const walletClient = createWalletClient({
      chain: monadTestnet,
      transport: custom(window.ethereum!),
    });
    
    // Get accounts from wallet client
    const [account] = await walletClient.getAddresses();

    const data = encodeFunctionData({
      abi: MONAD_IRC_ABI,
      functionName: "revokeSession",
      args: [],
    });

    const hash = await walletClient.sendTransaction({
      to: CONTRACT_ADDRESS,
      data,
      account,
      chain: monadTestnet,
    });

    return hash;
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
