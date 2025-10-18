"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type Address } from "viem";
import { type MetaMaskSmartAccount, type InfuraBundlerClient } from "@metamask/delegation-toolkit";
import { 
  initializeSmartAccount,
  isMetaMaskInstalled,
  ensureSmartAccountDeployed,
  isSmartAccountDeployed,
  createMonadPublicClient,
} from "@/lib/utils/smartAccount";

// Global storage for Smart Account and bundler client
// This is needed because these instances must persist across renders
let globalSmartAccount: MetaMaskSmartAccount | null = null;
let globalBundlerClient: InfuraBundlerClient | null = null;

/**
 * Hook for managing Smart Account connection and state
 * Uses MetaMask Delegation Toolkit for Smart Account management
 * Strictly enforces MetaMask wallet usage
 */
export const useSmartAccount = () => {
  const { 
    setUser, 
    setConnected, 
    addTerminalLine, 
    user,
    isWalletMonitoring,
    setWalletMonitoring,
    setDelegationSession,
    setDelegationActive,
  } = useIRC();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const accountChangeListenerRef = useRef<((...args: unknown[]) => void) | null>(null);
  const chainChangeListenerRef = useRef<((...args: unknown[]) => void) | null>(null);
  const disconnectListenerRef = useRef<((...args: unknown[]) => void) | null>(null);

  // Convex mutations and queries
  const createOrGetUserMutation = useMutation(api.users.createOrGetUser);
  const getUserWithSession = useQuery(
    api.users.getUserWithSession,
    user ? { walletAddress: user.walletAddress } : "skip"
  );

  /**
   * Get the stored Smart Account instance
   */
  const getSmartAccount = useCallback(() => {
    return globalSmartAccount;
  }, []);

  /**
   * Get the stored bundler client instance
   */
  const getBundlerClient = useCallback(() => {
    return globalBundlerClient;
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
      
      addTerminalLine("Verification message signed successfully!", "system");
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
      addTerminalLine("Checking database for existing user...", "info");
      
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

      // Check if user has an active delegation session
      if (convexUser.activeSessionId) {
        addTerminalLine("Active delegation session found! Restoring...", "system");
        // Session will be restored by the useDelegation hook
      } else {
        addTerminalLine("No active delegation session. Use 'authorize session' to create one.", "info");
      }

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
      setDelegationSession(null);
      setDelegationActive(false);
      globalSmartAccount = null;
      globalBundlerClient = null;
    } else if (accounts[0] !== user?.walletAddress) {
      // User switched accounts
      addTerminalLine(`Account changed to: ${accounts[0]}`, "warning");
      addTerminalLine("Please reconnect your wallet manually.", "info");
      
      // Disconnect current session
      setUser(null);
      setConnected(false);
      setDelegationSession(null);
      setDelegationActive(false);
      globalSmartAccount = null;
      globalBundlerClient = null;
    }
  }, [user, setUser, setConnected, setDelegationSession, setDelegationActive, addTerminalLine]);

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
      setDelegationSession(null);
      setDelegationActive(false);
      globalSmartAccount = null;
      globalBundlerClient = null;
    };

    // Setup listeners
    if (ethereum.on) {
      ethereum.on("accountsChanged", accountChangeListenerRef.current);
      ethereum.on("chainChanged", chainChangeListenerRef.current);
      ethereum.on("disconnect", disconnectListenerRef.current);
    }

    setWalletMonitoring(true);
    addTerminalLine("Wallet monitoring enabled.", "system");
  }, [isWalletMonitoring, handleAccountsChanged, handleChainChanged, setWalletMonitoring, setUser, setConnected, setDelegationSession, setDelegationActive, addTerminalLine]);

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
   */
  const connectSmartAccount = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Check if MetaMask is installed
      if (!isMetaMaskInstalled()) {
        addTerminalLine("❌ MetaMask not detected!", "error");
        addTerminalLine("This application requires MetaMask.", "error");
        addTerminalLine("Please install MetaMask from https://metamask.io", "info");
        setIsConnecting(false);
        return;
      }

      // Verify it's actually MetaMask (not another wallet)
      if (!(window.ethereum as any).isMetaMask) {
        addTerminalLine("❌ MetaMask is required!", "error");
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
        addTerminalLine("❌ Failed to initialize Smart Account.", "error");
        addTerminalLine("Please check your MetaMask connection and try again.", "info");
        setIsConnecting(false);
        return;
      }

      const { eoaAddress, smartAccountAddress, smartAccount, bundlerClient, publicClient } = smartAccountData;
      
      // Store Smart Account and bundler client globally
      globalSmartAccount = smartAccount;
      globalBundlerClient = bundlerClient;
      
      addTerminalLine(`EOA Address: ${eoaAddress}`, "system");
      addTerminalLine(`Smart Account: ${smartAccountAddress}`, "system");
      
      // Check if Smart Account is deployed
      const isDeployed = await isSmartAccountDeployed(publicClient, smartAccountAddress);
      
      if (!isDeployed) {
        addTerminalLine("ℹ️  Smart Account not deployed yet.", "info");
        addTerminalLine("It will be deployed automatically with your first transaction.", "info");
      } else {
        addTerminalLine("✅ Smart Account already deployed!", "system");
      }
      
      // Sign verification message
      const signature = await signVerificationMessage(
        eoaAddress,
        smartAccountAddress
      );
      
      if (!signature) {
        addTerminalLine("❌ Verification signature required to proceed.", "error");
        setIsConnecting(false);
        return;
      }

      // Create or restore user
      const newUser = await restoreOrCreateUser(
        eoaAddress,
        smartAccountAddress,
        signature
      );
      
      if (newUser) {
        setConnected(true);
        addTerminalLine("✅ Smart Account connected successfully!", "system");
        
        // Setup wallet monitoring
        setupWalletMonitoring();
        
        // Check for active delegation session
        if (getUserWithSession?.activeSession) {
          addTerminalLine("Active delegation session restored!", "system");
        } else {
          addTerminalLine("Run 'authorize session' to enable gasless transactions.", "info");
        }
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User rejected") || errorMessage.includes("User denied")) {
        addTerminalLine("❌ Connection cancelled by user.", "warning");
      } else if (errorMessage.includes("MetaMask")) {
        addTerminalLine(`❌ MetaMask error: ${errorMessage}`, "error");
        addTerminalLine("Please ensure MetaMask is properly installed and unlocked.", "info");
      } else {
        addTerminalLine(`❌ Connection failed: ${errorMessage}`, "error");
      }
      
      // Clean up on error
      globalSmartAccount = null;
      globalBundlerClient = null;
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
    getUserWithSession,
  ]);

  /**
   * Disconnect Smart Account
   */
  const disconnectSmartAccount = useCallback(() => {
    cleanupWalletMonitoring();
    setUser(null);
    setConnected(false);
    setDelegationSession(null);
    setDelegationActive(false);
    globalSmartAccount = null;
    globalBundlerClient = null;
    addTerminalLine("Smart Account disconnected.", "info");
  }, [setUser, setConnected, setDelegationSession, setDelegationActive, addTerminalLine, cleanupWalletMonitoring]);

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
    getBundlerClient,
    isConnecting,
    isDeploying,
    isWalletMonitoring,
  };
};

// Export functions to access global Smart Account and bundler client
export const getGlobalSmartAccount = () => globalSmartAccount;
export const getGlobalBundlerClient = () => globalBundlerClient;
