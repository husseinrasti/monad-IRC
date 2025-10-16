"use client";

import { useState, useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";

export const useWallet = () => {
  const { setUser, setConnected, addTerminalLine } = useIRC();
  const [isConnecting, setIsConnecting] = useState(false);

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
      });

      if (!accounts || accounts.length === 0) {
        addTerminalLine("No accounts found.", "error");
        setIsConnecting(false);
        return;
      }

      const walletAddress = accounts[0];
      
      // Create user object
      const user = {
        id: `user-${Date.now()}`,
        walletAddress,
        username: `user_${walletAddress.slice(2, 8)}`,
      };

      setUser(user);
      setConnected(true);
      
      addTerminalLine(`Connected: ${walletAddress}`, "system");
      addTerminalLine("Wallet connected successfully!", "info");
      addTerminalLine("Run 'authorize session' to enable gasless transactions.", "info");

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Connection failed: ${errorMessage}`, "error");
    } finally {
      setIsConnecting(false);
    }
  }, [setUser, setConnected, addTerminalLine]);

  const disconnectWallet = useCallback(() => {
    setUser(null);
    setConnected(false);
    addTerminalLine("Wallet disconnected.", "info");
  }, [setUser, setConnected, addTerminalLine]);

  return {
    connectWallet,
    disconnectWallet,
    isConnecting,
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

