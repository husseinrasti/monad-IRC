"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type Address, type PublicClient, type WalletClient } from "viem";
import { type BundlerClient, type PaymasterClient } from "viem/account-abstraction";
import { type MetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import { 
  initializeSmartAccount,
  isMetaMaskInstalled,
  isSmartAccountDeployed,
  createMonadPublicClient,
} from "@/lib/utils/smartAccount";

// Global storage for Smart Account and clients
// These instances persist across renders for transaction consistency
let globalSmartAccount: MetaMaskSmartAccount | null = null;
let globalPublicClient: PublicClient | null = null;
let globalWalletClient: WalletClient | null = null;
let globalBundlerClient: BundlerClient | null = null;
let globalPaymasterClient: PaymasterClient | null = null;

/**
 * Hook for managing Smart Account connection and state
 * Uses MetaMask Delegation Toolkit exclusively
 * 
 * Features:
 * - Simple wallet connection flow
 * - Automatic Smart Account creation
 * - No session management - direct signing via MetaMask
 * - SDK handles all transaction complexity
 */
export const useSmartAccount = () => {
  const { 
    setUser, 
    setConnected, 
    addTerminalLine, 
    user,
    isWalletMonitoring,
    setWalletMonitoring,
  } = useIRC();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const accountChangeListenerRef = useRef<((...args: unknown[]) => void) | null>(null);
  const chainChangeListenerRef = useRef<((...args: unknown[]) => void) | null>(null);
  const disconnectListenerRef = useRef<((...args: unknown[]) => void) | null>(null);

  // Convex mutations and queries
  const createOrGetUserMutation = useMutation(api.users.createOrGetUser);

  /**
   * Get the stored Smart Account instance
   */
  const getSmartAccount = useCallback(() => {
    return globalSmartAccount;
  }, []);

  /**
   * Get the stored public client instance
   */
  const getPublicClient = useCallback(() => {
    return globalPublicClient;
  }, []);

  /**
   * Get the stored wallet client instance
   */
  const getWalletClient = useCallback(() => {
    return globalWalletClient;
  }, []);

  /**
   * Get the stored bundler client instance
   */
  const getBundlerClient = useCallback(() => {
    return globalBundlerClient;
  }, []);

  /**
   * Get the stored paymaster client instance
   */
  const getPaymasterClient = useCallback(() => {
    return globalPaymasterClient;
  }, []);

  /**
   * Sign verification message with MetaMask
   */
  const signVerificationMessage = useCallback(async (
    walletAddress: Address,
    smartAccountAddress: Address
  ): Promise<string | null> => {
    try {
      addTerminalLine("Please sign the verification message in MetaMask...", "warning");
      
      if (!window.ethereum || !(window.ethereum as any).isMetaMask) {
        throw new Error("MetaMask not detected. Please ensure MetaMask is installed and active.");
      }

      // Request signature via MetaMask
      const message = `Verify Smart Account for Monad IRC\nEOA: ${walletAddress}\nSmart Account: ${smartAccountAddress}\nTimestamp: ${Date.now()}`;
      
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      }) as string;
      
      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to sign verification message: ${errorMessage}`, "error");
      throw error;
    }
  }, [addTerminalLine]);

  /**
   * Create or restore user in Convex database
   */
  const restoreOrCreateUser = useCallback(async (
    walletAddress: Address,
    smartAccountAddress: Address,
    verificationSignature: string
  ) => {
    try {
      
      // Use smart account address as username by default
      const username = smartAccountAddress;
      
      // Create or get user from Convex
      const convexUser = await createOrGetUserMutation({
        walletAddress,
        username,
        verificationSignature,
        smartAccountAddress,
      });

      if (!convexUser) {
        throw new Error("Failed to create or retrieve user from database");
      }

      const newUser = {
        id: convexUser._id,
        walletAddress: convexUser.walletAddress,
        username: convexUser.username,
        smartAccountAddress: convexUser.smartAccountAddress || smartAccountAddress,
        convexUserId: convexUser._id,
        verificationSignature: convexUser.verificationSignature,
        lastConnected: new Date(convexUser.lastConnected || Date.now()),
      };

      setUser(newUser);

      return newUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to restore/create user: ${errorMessage}`, "error");
      throw error;
    }
  }, [createOrGetUserMutation, setUser, addTerminalLine]);

  /**
   * Handle account changes from MetaMask
   */
  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected wallet
      addTerminalLine("Wallet disconnected by user.", "warning");
      setUser(null);
      setConnected(false);
      globalSmartAccount = null;
      globalPublicClient = null;
      globalWalletClient = null;
      globalBundlerClient = null;
      globalPaymasterClient = null;
    } else if (accounts[0] !== user?.walletAddress) {
      // User switched accounts
      addTerminalLine(`Account changed to: ${accounts[0]}`, "warning");
      addTerminalLine("Please reconnect your wallet manually.", "info");
      
      // Disconnect current session
      setUser(null);
      setConnected(false);
      globalSmartAccount = null;
      globalPublicClient = null;
      globalWalletClient = null;
      globalBundlerClient = null;
      globalPaymasterClient = null;
    }
  }, [user, setUser, setConnected, addTerminalLine]);

  /**
   * Handle chain/network changes
   */
  const handleChainChanged = useCallback(() => {
    addTerminalLine("Network changed. Please reconnect your wallet.", "warning");
    window.location.reload();
  }, [addTerminalLine]);

  /**
   * Setup wallet monitoring
   */
  const setupWalletMonitoring = useCallback(() => {
    if (!window.ethereum || isWalletMonitoring) return;

    const ethereum = window.ethereum;

    // Remove existing listeners
    if (accountChangeListenerRef.current && ethereum.removeListener) {
      ethereum.removeListener("accountsChanged", accountChangeListenerRef.current);
    }
    if (chainChangeListenerRef.current && ethereum.removeListener) {
      ethereum.removeListener("chainChanged", chainChangeListenerRef.current);
    }
    if (disconnectListenerRef.current && ethereum.removeListener) {
      ethereum.removeListener("disconnect", disconnectListenerRef.current);
    }

    // Create new listeners
    accountChangeListenerRef.current = (...args: unknown[]) => {
      handleAccountsChanged(args[0] as string[]);
    };
    chainChangeListenerRef.current = (..._args: unknown[]) => {
      handleChainChanged();
    };
    disconnectListenerRef.current = (..._args: unknown[]) => {
      addTerminalLine("Wallet disconnected.", "warning");
      setUser(null);
      setConnected(false);
      globalSmartAccount = null;
      globalPublicClient = null;
      globalWalletClient = null;
      globalBundlerClient = null;
      globalPaymasterClient = null;
    };

    // Setup listeners
    if (ethereum.on) {
      ethereum.on("accountsChanged", accountChangeListenerRef.current);
      ethereum.on("chainChanged", chainChangeListenerRef.current);
      ethereum.on("disconnect", disconnectListenerRef.current);
    }

    setWalletMonitoring(true);
  }, [isWalletMonitoring, handleAccountsChanged, handleChainChanged, setWalletMonitoring, setUser, setConnected, addTerminalLine]);

  /**
   * Cleanup wallet monitoring
   */
  const cleanupWalletMonitoring = useCallback(() => {
    if (!window.ethereum) return;

    const ethereum = window.ethereum;

    if (accountChangeListenerRef.current && ethereum.removeListener) {
      ethereum.removeListener("accountsChanged", accountChangeListenerRef.current);
    }
    if (chainChangeListenerRef.current && ethereum.removeListener) {
      ethereum.removeListener("chainChanged", chainChangeListenerRef.current);
    }
    if (disconnectListenerRef.current && ethereum.removeListener) {
      ethereum.removeListener("disconnect", disconnectListenerRef.current);
    }

    setWalletMonitoring(false);
  }, [setWalletMonitoring]);

  /**
   * Connect Smart Account using MetaMask Delegation Toolkit
   * Simple flow: Connect → Create Smart Account → Done
   * No session management needed - SDK handles everything
   */
  const connectSmartAccount = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Check if MetaMask is installed
      if (!isMetaMaskInstalled()) {
        addTerminalLine("Please install MetaMask from https://metamask.io", "info");
        setIsConnecting(false);
        return;
      }

      // Verify it's actually MetaMask (not another wallet)
      if (!(window.ethereum as any).isMetaMask) {
        addTerminalLine("Please make sure MetaMask is your active wallet.", "error");
        setIsConnecting(false);
        return;
      }

      addTerminalLine("Connecting to MetaMask...", "info");

      // Request accounts from MetaMask
      await window.ethereum!.request({
        method: "eth_requestAccounts",
      });

      addTerminalLine("Initializing MetaMask Smart Account...", "info");

      // Initialize Smart Account using Delegation Toolkit
      const smartAccountData = await initializeSmartAccount();
      
      if (!smartAccountData) {
        addTerminalLine("Please check your MetaMask connection and try again.", "info");
        setIsConnecting(false);
        return;
      }

      const { 
        eoaAddress, 
        smartAccountAddress, 
        smartAccount, 
        publicClient,
        walletClient,
        bundlerClient,
        paymasterClient,
      } = smartAccountData;
      
      // Store all clients globally
      globalSmartAccount = smartAccount;
      globalPublicClient = publicClient;
      globalWalletClient = walletClient;
      globalBundlerClient = bundlerClient;
      globalPaymasterClient = paymasterClient;
      
      addTerminalLine(`EOA Address: ${eoaAddress}`, "system");
      addTerminalLine(`Smart Account: ${smartAccountAddress}`, "system");
      
      // Check if Smart Account is deployed
      const isDeployed = await isSmartAccountDeployed(publicClient, smartAccountAddress);
      
      if (!isDeployed) {
        addTerminalLine("Smart Account will be deployed with your first transaction.", "info");
      } else {
        addTerminalLine("Smart Account already deployed!", "system");
      }
      
      // Sign verification message
      const signature = await signVerificationMessage(
        eoaAddress,
        smartAccountAddress
      );
      
      if (!signature) {
        addTerminalLine("Verification signature required to proceed.", "error");
        setIsConnecting(false);
        return;
      }

      addTerminalLine(`Creating or restoring smart account...`, "system");
      // Create or restore user
      const newUser = await restoreOrCreateUser(
        eoaAddress,
        smartAccountAddress,
        signature
      );
      
      if (newUser) {
        setConnected(true);
        
        // Setup wallet monitoring
        setupWalletMonitoring();
        
        addTerminalLine("Connected! You can now join channels and send messages.", "system");
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User rejected") || errorMessage.includes("User denied")) {
        addTerminalLine("Connection cancelled by user.", "warning");
      } else if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is properly installed and unlocked.", "info");
      } else {
        addTerminalLine(`Connection failed: ${errorMessage}`, "error");
      }
      
      // Clean up on error
      globalSmartAccount = null;
      globalPublicClient = null;
      globalWalletClient = null;
      globalBundlerClient = null;
      globalPaymasterClient = null;
    } finally {
      setIsConnecting(false);
    }
  }, [
    setUser, 
    setConnected, 
    addTerminalLine, 
    signVerificationMessage, 
    restoreOrCreateUser, 
    setupWalletMonitoring,
  ]);

  /**
   * Disconnect Smart Account
   */
  const disconnectSmartAccount = useCallback(() => {
    cleanupWalletMonitoring();
    setUser(null);
    setConnected(false);
    globalSmartAccount = null;
    globalPublicClient = null;
    globalWalletClient = null;
    globalBundlerClient = null;
    globalPaymasterClient = null;
    addTerminalLine("Smart Account disconnected.", "info");
  }, [setUser, setConnected, addTerminalLine, cleanupWalletMonitoring]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupWalletMonitoring();
    };
  }, [cleanupWalletMonitoring]);

  return {
    connectSmartAccount,
    disconnectSmartAccount,
    getSmartAccount,
    getPublicClient,
    getWalletClient,
    getBundlerClient,
    getPaymasterClient,
    isConnecting,
    isDeploying,
    isWalletMonitoring,
  };
};

// Export functions to access global clients
export const getGlobalSmartAccount = () => globalSmartAccount;
export const getGlobalPublicClient = () => globalPublicClient;
export const getGlobalWalletClient = () => globalWalletClient;
export const getGlobalBundlerClient = () => globalBundlerClient;
export const getGlobalPaymasterClient = () => globalPaymasterClient;
