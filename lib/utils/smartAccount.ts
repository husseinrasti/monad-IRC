"use client";

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  custom, 
  type PublicClient, 
  type WalletClient,
  type Account,
  type Address,
  type Chain,
} from "viem";
import { createBundlerClient, type BundlerClient } from "viem/account-abstraction";
import { 
  toMetaMaskSmartAccount, 
  Implementation,
  type MetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";
import { monadTestnet } from "./monadChain";

/**
 * Smart Account Client utilities for Monad IRC
 * This module provides utilities to create and manage MetaMask Smart Accounts
 * using the MetaMask Delegation Toolkit SDK
 */

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || RPC_URL; // Use RPC URL as fallback
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

/**
 * Check if MetaMask is installed and available
 */
export const isMetaMaskInstalled = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window.ethereum && (window.ethereum as any).isMetaMask);
};

/**
 * Validate that the connected wallet is MetaMask
 */
export const validateMetaMaskWallet = (): boolean => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install MetaMask to use this application.");
  }
  return true;
};

/**
 * Create a public client for reading blockchain data
 */
export const createMonadPublicClient = (): PublicClient => {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(RPC_URL),
  });
};

/**
 * Create a bundler client for handling Smart Account user operations
 * Note: Monad testnet may not have bundler support yet
 */
export const createMonadBundlerClient = (): BundlerClient | null => {
  try {
    // Check if a custom bundler URL is configured
    const customBundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL;
    
    if (!customBundlerUrl) {
      console.warn("No bundler URL configured. Bundler client not available.");
      return null;
    }
    
    return createBundlerClient({
      chain: monadTestnet,
      transport: http(customBundlerUrl),
    });
  } catch (error) {
    console.error("Failed to create bundler client:", error);
    return null;
  }
};

/**
 * Create a wallet client connected to MetaMask
 */
export const createMetaMaskWalletClient = async (): Promise<WalletClient | null> => {
  try {
    validateMetaMaskWallet();

    const walletClient = createWalletClient({
      chain: monadTestnet,
      transport: custom(window.ethereum!),
    });

    return walletClient;
  } catch (error) {
    console.error("Failed to create MetaMask wallet client:", error);
    return null;
  }
};

/**
 * Create or fetch a MetaMask Smart Account using the Delegation Toolkit SDK
 */
export const createMetaMaskSmartAccount = async (
  publicClient: PublicClient,
  ownerAddress: Address
): Promise<MetaMaskSmartAccount | null> => {
  try {
    console.log("Creating MetaMask Smart Account for:", ownerAddress);

    // Create a wallet client for signing through MetaMask
    const signingWalletClient = createWalletClient({
      account: ownerAddress,
      chain: monadTestnet,
      transport: custom(window.ethereum!),
    });

    // Create MetaMask Smart Account using the Delegation Toolkit
    // Using Hybrid implementation with EOA owner
    // deployParams: [owner, keyIds, xValues, yValues] for Hybrid
    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [
        ownerAddress, // owner address
        [], // keyIds (empty for ECDSA-only)
        [], // xValues (empty for ECDSA-only)
        [], // yValues (empty for ECDSA-only)
      ],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000000",
      signer: {
        walletClient: signingWalletClient,
      },
    });

    console.log("MetaMask Smart Account created:", smartAccount.address);
    return smartAccount;
  } catch (error) {
    console.error("Failed to create MetaMask Smart Account:", error);
    return null;
  }
};

/**
 * Check if Smart Account is deployed on-chain
 */
export const isSmartAccountDeployed = async (
  publicClient: PublicClient,
  smartAccountAddress: Address
): Promise<boolean> => {
  try {
    const code = await publicClient.getBytecode({
      address: smartAccountAddress,
    });
    return !!code && code !== "0x";
  } catch (error) {
    console.error("Failed to check Smart Account deployment:", error);
    return false;
  }
};

/**
 * Check if Smart Account needs deployment
 * Note: Smart Accounts are deployed automatically with the first transaction
 * We don't need to manually deploy them
 */
export const ensureSmartAccountDeployed = async (
  smartAccount: MetaMaskSmartAccount,
  bundlerClient: BundlerClient | null
): Promise<boolean> => {
  try {
    const publicClient = createMonadPublicClient();
    const isDeployed = await isSmartAccountDeployed(publicClient, smartAccount.address);

    if (isDeployed) {
      console.log("Smart Account already deployed at:", smartAccount.address);
      return true;
    }

    if (!bundlerClient) {
      console.log("Smart Account not deployed. Without bundler, deployment must be done manually via direct transaction.");
      return true; // Allow transaction to proceed
    }

    console.log("Smart Account not deployed yet. It will be deployed automatically with your first transaction.");
    // Return true because deployment will happen automatically with the first user operation
    return true;
  } catch (error) {
    console.error("Failed to check Smart Account deployment:", error);
    // Even if check fails, return true to allow the transaction to proceed
    // The bundler will handle deployment if needed
    return true;
  }
};

/**
 * Initialize Smart Account with MetaMask Delegation Toolkit
 */
export const initializeSmartAccount = async (): Promise<{
  eoaAddress: Address;
  smartAccountAddress: Address;
  smartAccount: MetaMaskSmartAccount;
  walletClient: WalletClient;
  publicClient: PublicClient;
  bundlerClient: BundlerClient | null;
} | null> => {
  try {
    // Validate MetaMask is installed
    validateMetaMaskWallet();

    // Create clients
    const walletClient = await createMetaMaskWalletClient();
    if (!walletClient) {
      throw new Error("Failed to create MetaMask wallet client");
    }

    const publicClient = createMonadPublicClient();
    const bundlerClient = createMonadBundlerClient();
    
    if (!bundlerClient) {
      console.warn("⚠️  Bundler client not available. Account abstraction features will be limited.");
      console.warn("To enable full AA features, configure NEXT_PUBLIC_BUNDLER_URL in your environment.");
    }

    // Get accounts from MetaMask
    const accounts = await walletClient.getAddresses();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in MetaMask");
    }

    const eoaAddress = accounts[0];

    // Create MetaMask Smart Account
    const smartAccount = await createMetaMaskSmartAccount(
      publicClient, 
      eoaAddress
    );
    
    if (!smartAccount) {
      throw new Error("Failed to create MetaMask Smart Account");
    }

    const smartAccountAddress = smartAccount.address;

    // Check if Smart Account is deployed
    const isDeployed = await isSmartAccountDeployed(publicClient, smartAccountAddress);
    console.log("Smart Account deployment status:", isDeployed ? "Deployed" : "Not deployed");

    return {
      eoaAddress,
      smartAccountAddress,
      smartAccount,
      walletClient,
      publicClient,
      bundlerClient,
    };
  } catch (error) {
    console.error("Failed to initialize Smart Account:", error);
    return null;
  }
};

export { CONTRACT_ADDRESS, RPC_URL, BUNDLER_URL };
