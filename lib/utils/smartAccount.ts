"use client";

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  custom, 
  type PublicClient, 
  type WalletClient,
  type Address,
} from "viem";
import { 
  createBundlerClient, 
  createPaymasterClient,
  type BundlerClient,
  type PaymasterClient,
} from "viem/account-abstraction";
import { 
  toMetaMaskSmartAccount, 
  Implementation,
  type MetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";
import { monadTestnet } from "./monadChain";

/**
 * Smart Account Client utilities for Monad IRC
 * Built with @metamask/delegation-toolkit and viem/account-abstraction
 * 
 * Architecture:
 * 1. Create Smart Account via MetaMask Delegation Toolkit
 * 2. Use createBundlerClient for ERC-4337 user operations
 * 3. Use createPaymasterClient for gasless transactions (optional)
 */

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
const ALCHEMY_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID || "";

// Alchemy bundler endpoint format: https://monad-testnet.g.alchemy.com/v2/YOUR_API_KEY
const BUNDLER_URL = ALCHEMY_API_KEY 
  ? `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : process.env.NEXT_PUBLIC_BUNDLER_URL || RPC_URL;

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
 * Create a MetaMask Smart Account using the Delegation Toolkit
 * Follows the pattern from the example: toMetaMaskSmartAccount with walletClient signer
 * 
 * @param publicClient - Public client for blockchain reads
 * @param walletClient - Wallet client for signing
 * @param owner - Owner address (EOA from MetaMask)
 * @returns MetaMaskSmartAccount instance
 */
export const createSmartAccount = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  owner: Address
): Promise<MetaMaskSmartAccount> => {
  // Create wallet client with explicit account for signing
  const signingWalletClient = createWalletClient({
    account: owner,
    chain: monadTestnet,
    transport: custom(window.ethereum!),
  });

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [owner, [], [], []],
    deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000000",
    signer: { walletClient: signingWalletClient },
  });
  
  return smartAccount;
};

/**
 * Create Alchemy bundler client for handling ERC-4337 user operations
 * 
 * @param publicClient - Public client instance
 * @returns BundlerClient configured for Alchemy's bundler
 */
export const createMonadBundlerClient = (publicClient: PublicClient): BundlerClient => {
  return createBundlerClient({
    client: publicClient,
    transport: http(BUNDLER_URL),
  });
};

/**
 * Create paymaster client for gasless transactions
 * 
 * @returns PaymasterClient configured for Alchemy's paymaster
 */
export const createMonadPaymasterClient = (): PaymasterClient => {
  return createPaymasterClient({
    transport: http(BUNDLER_URL),
  });
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
 * Initialize Smart Account with all necessary clients
 * Follows the pattern from the example with separated client creation
 * 
 * @returns Object containing all clients and account information
 */
export const initializeSmartAccount = async (): Promise<{
  eoaAddress: Address;
  smartAccountAddress: Address;
  smartAccount: MetaMaskSmartAccount;
  publicClient: PublicClient;
  walletClient: WalletClient;
  bundlerClient: BundlerClient;
  paymasterClient: PaymasterClient | null;
} | null> => {
  try {
    // Validate MetaMask is installed
    validateMetaMaskWallet();

    // Create public client
    const publicClient = createMonadPublicClient();

    // Create wallet client with MetaMask
    const walletClient = createWalletClient({
      chain: monadTestnet,
      transport: custom(window.ethereum!),
    });

    // Get accounts from MetaMask
    const accounts = await walletClient.getAddresses();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in MetaMask");
    }

    const owner = accounts[0];

    // Create Smart Account
    const smartAccount = await createSmartAccount(publicClient, walletClient, owner);
    console.log("Smart Account Address:", smartAccount.address);

    // Create bundler client
    const bundlerClient = createMonadBundlerClient(publicClient);

    // Create paymaster client (optional)
    let paymasterClient: PaymasterClient | null = null;
    if (ALCHEMY_API_KEY && ALCHEMY_POLICY_ID) {
      paymasterClient = createMonadPaymasterClient();
      console.log("✅ Paymaster client created for gasless transactions");
    } else {
      console.log("⚠️  No paymaster configured. Transactions will require gas.");
    }

    // Check deployment status
    const isDeployed = await isSmartAccountDeployed(publicClient, smartAccount.address);
    console.log("Smart Account deployment status:", isDeployed ? "✅ Deployed" : "⏳ Will deploy with first transaction");

    return {
      eoaAddress: owner,
      smartAccountAddress: smartAccount.address,
      smartAccount,
      publicClient,
      walletClient,
      bundlerClient,
      paymasterClient,
    };
  } catch (error) {
    console.error("Failed to initialize Smart Account:", error);
    return null;
  }
};

export { 
  CONTRACT_ADDRESS, 
  RPC_URL, 
  BUNDLER_URL, 
  ALCHEMY_API_KEY,
  ALCHEMY_POLICY_ID,
};
