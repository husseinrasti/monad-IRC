"use client";

import { 
  createWalletClient,
  custom,
  type WalletClient,
  type Address,
  type PublicClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./monadChain";
import { CONTRACT_ADDRESS } from "./smartAccount";

/**
 * Delegation utilities for creating and managing session keys
 * With Account Abstraction, session management is handled by MetaMask Delegation SDK
 * No on-chain session authorization needed
 */

export interface SessionKeyData {
  address: Address;
  privateKey: `0x${string}`;
  validUntil: number;
  allowedContracts: Address[];
}

/**
 * Create a new session key (delegated signer)
 * This is just for local signing - no on-chain authorization needed
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
 * Create a wallet client for a session key
 * Used for signing messages locally
 */
export const createSessionKeyWalletClient = (
  sessionKeyData: SessionKeyData
): WalletClient => {
  const account = privateKeyToAccount(sessionKeyData.privateKey);

  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: custom(window.ethereum!),
  });
};

/**
 * Check if session key is still valid (not expired)
 */
export const isSessionKeyValid = (sessionKeyData: SessionKeyData): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return sessionKeyData.validUntil > now;
};
