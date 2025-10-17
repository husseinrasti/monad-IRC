"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { ethers } from "ethers";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const useWallet = () => {
  const { 
    setUser, 
    setConnected, 
    addTerminalLine, 
    user,
    isWalletMonitoring,
    setWalletMonitoring,
    setSessionKey,
    setSessionAuthorized,
  } = useIRC();
  
  const [isConnecting, setIsConnecting] = useState(false);
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
   * Sign verification message with wallet
   */
  const signVerificationMessage = useCallback(async (
    walletAddress: string,
    provider: ethers.BrowserProvider
  ): Promise<string | null> => {
    try {
      addTerminalLine("Please sign the verification message...", "warning");
      
      const signer = await provider.getSigner();
      const message = `Verify wallet ownership for Monad IRC\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      const signature = await signer.signMessage(message);
      
      addTerminalLine("Verification message signed successfully!", "system");
      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to sign verification message: ${errorMessage}`, "error");
      return null;
    }
  }, [addTerminalLine]);

  /**
   * Check if user exists in database and restore session
   */
  const restoreOrCreateUser = useCallback(async (
    walletAddress: string,
    verificationSignature: string
  ) => {
    try {
      addTerminalLine("Checking database for existing user...", "info");
      
      // Use full wallet address as default username
      const username = walletAddress;
      
      // Create or get user from Convex
      const convexUser = await createOrGetUserMutation({
        walletAddress,
        username,
        verificationSignature,
      });

      if (!convexUser) {
        throw new Error("Failed to create or retrieve user from database");
      }

      const newUser = {
        id: convexUser._id,
        walletAddress: convexUser.walletAddress,
        username: convexUser.username,
        smartAccountAddress: convexUser.smartAccountAddress,
        convexUserId: convexUser._id,
        verificationSignature: convexUser.verificationSignature,
        lastConnected: new Date(convexUser.lastConnected || Date.now()),
      };

      setUser(newUser);

      // Check if user has an active session
      if (convexUser.activeSessionId) {
        addTerminalLine("Active session found! Restoring...", "system");
        // Session will be restored by the useSessionKey hook
      } else {
        addTerminalLine("No active session found. You can create one with 'authorize session'.", "info");
      }

      return newUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to restore/create user: ${errorMessage}`, "error");
      return null;
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
      setSessionKey(null);
      setSessionAuthorized(false);
    } else if (accounts[0] !== user?.walletAddress) {
      // User switched accounts
      addTerminalLine(`Account changed to: ${accounts[0]}`, "warning");
      addTerminalLine("Reconnecting with new account...", "info");
      
      // Disconnect current session
      setUser(null);
      setSessionKey(null);
      setSessionAuthorized(false);
      
      // Connect with new account
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signature = await signVerificationMessage(accounts[0], provider);
        
        if (signature) {
          await restoreOrCreateUser(accounts[0], signature);
          setConnected(true);
          addTerminalLine("Reconnected with new account!", "system");
        }
      }
    }
  }, [user, setUser, setConnected, setSessionKey, setSessionAuthorized, addTerminalLine, signVerificationMessage, restoreOrCreateUser]);

  /**
   * Handle chain/network changes
   */
  const handleChainChanged = useCallback(() => {
    addTerminalLine("Network changed. Please reconnect your wallet.", "warning");
    // Reload the page to reset state
    window.location.reload();
  }, [addTerminalLine]);

  /**
   * Setup wallet monitoring
   */
  const setupWalletMonitoring = useCallback(() => {
    if (!window.ethereum || isWalletMonitoring) return;

    // Remove existing listeners
    if (accountChangeListenerRef.current) {
      window.ethereum.removeListener("accountsChanged", accountChangeListenerRef.current);
    }
    if (chainChangeListenerRef.current) {
      window.ethereum.removeListener("chainChanged", chainChangeListenerRef.current);
    }
    if (disconnectListenerRef.current) {
      window.ethereum.removeListener("disconnect", disconnectListenerRef.current);
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
      setSessionKey(null);
      setSessionAuthorized(false);
    };

    // Setup listeners
    window.ethereum.on("accountsChanged", accountChangeListenerRef.current);
    window.ethereum.on("chainChanged", chainChangeListenerRef.current);
    window.ethereum.on("disconnect", disconnectListenerRef.current);

    setWalletMonitoring(true);
    addTerminalLine("Wallet monitoring enabled.", "system");
  }, [isWalletMonitoring, handleAccountsChanged, handleChainChanged, setWalletMonitoring, setUser, setConnected, setSessionKey, setSessionAuthorized, addTerminalLine]);

  /**
   * Cleanup wallet monitoring
   */
  const cleanupWalletMonitoring = useCallback(() => {
    if (!window.ethereum) return;

    if (accountChangeListenerRef.current) {
      window.ethereum.removeListener("accountsChanged", accountChangeListenerRef.current);
    }
    if (chainChangeListenerRef.current) {
      window.ethereum.removeListener("chainChanged", chainChangeListenerRef.current);
    }
    if (disconnectListenerRef.current) {
      window.ethereum.removeListener("disconnect", disconnectListenerRef.current);
    }

    setWalletMonitoring(false);
  }, [setWalletMonitoring]);

  /**
   * Connect wallet
   */
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        addTerminalLine("MetaMask not found. Please install MetaMask.", "error");
        setIsConnecting(false);
        return;
      }

      addTerminalLine("Connecting to MetaMask...", "info");

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        addTerminalLine("No accounts found.", "error");
        setIsConnecting(false);
        return;
      }

      const walletAddress = accounts[0];
      addTerminalLine(`Wallet detected: ${walletAddress}`, "system");
      
      // Sign verification message
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signature = await signVerificationMessage(walletAddress, provider);
      
      if (!signature) {
        addTerminalLine("Verification signature required to proceed.", "error");
        setIsConnecting(false);
        return;
      }

      // Create or restore user
      const newUser = await restoreOrCreateUser(walletAddress, signature);
      
      if (newUser) {
        setConnected(true);
        addTerminalLine(`Connected: ${walletAddress}`, "system");
        addTerminalLine("Wallet connected successfully!", "info");
        
        // Setup wallet monitoring
        setupWalletMonitoring();
        
        // Check for active session
        if (getUserWithSession?.activeSession) {
          addTerminalLine("Active session restored!", "system");
        } else {
          addTerminalLine("Run 'authorize session' to enable gasless transactions.", "info");
        }
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User rejected")) {
        addTerminalLine("Connection cancelled by user.", "warning");
      } else {
        addTerminalLine(`Connection failed: ${errorMessage}`, "error");
      }
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
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    cleanupWalletMonitoring();
    setUser(null);
    setConnected(false);
    setSessionKey(null);
    setSessionAuthorized(false);
    addTerminalLine("Wallet disconnected.", "info");
  }, [setUser, setConnected, setSessionKey, setSessionAuthorized, addTerminalLine, cleanupWalletMonitoring]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupWalletMonitoring();
    };
  }, [cleanupWalletMonitoring]);

  return {
    connectWallet,
    disconnectWallet,
    isConnecting,
    isWalletMonitoring,
  };
};

// Extend window with ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
