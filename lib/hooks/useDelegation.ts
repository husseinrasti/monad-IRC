"use client";

import { useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { type Address } from "viem";
import { 
  createSessionKey,
  isSessionKeyValid,
  type SessionKeyData,
} from "@/lib/utils/delegation";
import { isMetaMaskInstalled } from "@/lib/utils/smartAccount";
import { getGlobalSmartAccount, getGlobalBundlerClient } from "./useSmartAccount";
import { DelegationSession } from "@/lib/types";

/**
 * Hook for managing delegation sessions (session keys)
 * Simplified for Account Abstraction - no on-chain session authorization needed
 * MetaMask Delegation SDK handles delegation at the wallet level
 */
export const useDelegation = () => {
  const { 
    delegationSession, 
    setDelegationSession, 
    setDelegationActive, 
    addTerminalLine,
    user,
  } = useIRC();

  /**
   * Generate a new delegation session
   * This is just a local session key - no on-chain authorization needed
   */
  const generateDelegationSession = useCallback(async (
    validityMinutes: number = 30
  ): Promise<SessionKeyData | null> => {
    try {
      // Validate MetaMask is installed
      if (!isMetaMaskInstalled()) {
        addTerminalLine("MetaMask is required to create a delegation session.", "error");
        return null;
      }

      const sessionKeyData = await createSessionKey(validityMinutes * 60 * 1000);
      
      addTerminalLine("Delegation session key generated successfully.", "system");
      addTerminalLine(`Expires: ${new Date(sessionKeyData.validUntil * 1000).toLocaleString()}`, "info");
      
      return sessionKeyData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to generate delegation session: ${errorMessage}`, "error");
      
      if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
      }
      
      return null;
    }
  }, [addTerminalLine]);

  /**
   * Authorize delegation session (simplified - just store locally)
   * With AA, no on-chain authorization needed
   */
  const authorizeDelegation = useCallback(async () => {
    // Validate MetaMask is installed
    if (!isMetaMaskInstalled()) {
      addTerminalLine("Please install MetaMask from https://metamask.io", "info");
      return false;
    }

    if (!user || !user.smartAccountAddress) {
      addTerminalLine("Please connect your Smart Account first.", "error");
      return false;
    }

    try {
      // Generate new session key
      const sessionKeyData = await generateDelegationSession(30);
      
      if (!sessionKeyData) {
        addTerminalLine("Failed to generate session key.", "error");
        return false;
      }

      // Store in local storage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("monad_irc_session_key", JSON.stringify({
          address: sessionKeyData.address,
          privateKey: sessionKeyData.privateKey,
          validUntil: sessionKeyData.validUntil,
        }));
      }

      // Update local state
      const newSession: DelegationSession = {
        sessionAddress: sessionKeyData.address,
        validUntil: sessionKeyData.validUntil,
        allowedContracts: sessionKeyData.allowedContracts,
        isActive: true,
        createdAt: new Date(),
      };
      
      setDelegationSession(newSession);
      setDelegationActive(true);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
      } else {
        addTerminalLine(`Failed to authorize delegation session: ${errorMessage}`, "error");
      }
      
      // Clean up on error
      if (typeof window !== "undefined") {
        localStorage.removeItem("monad_irc_session_key");
      }
      
      return false;
    }
  }, [
    user,
    generateDelegationSession, 
    setDelegationSession,
    setDelegationActive, 
    addTerminalLine,
  ]);

  /**
   * Revoke the current delegation session
   */
  const revokeDelegation = useCallback(async () => {
    if (!delegationSession) {
      addTerminalLine("No active delegation session to revoke.", "warning");
      return;
    }

    try {
      // Clear from local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("monad_irc_session_key");
      }

      // Clear local state
      setDelegationSession(null);
      setDelegationActive(false);
      
      addTerminalLine("Delegation session revoked successfully.", "system");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to revoke delegation session: ${errorMessage}`, "error");
    }
  }, [
    delegationSession,
    setDelegationSession, 
    setDelegationActive, 
    addTerminalLine,
  ]);

  /**
   * Check if delegation session is still valid
   */
  const isDelegationValid = useCallback((): boolean => {
    if (!delegationSession || !delegationSession.isActive) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return delegationSession.validUntil > now;
  }, [delegationSession]);

  /**
   * Get session key data from local storage
   */
  const getStoredSessionKey = useCallback((): SessionKeyData | null => {
    if (typeof window === "undefined") return null;
    
    try {
      const stored = localStorage.getItem("monad_irc_session_key");
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Validate it's still valid
      const now = Math.floor(Date.now() / 1000);
      if (parsed.validUntil <= now) {
        localStorage.removeItem("monad_irc_session_key");
        return null;
      }
      
      const contractAddr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
      
      return {
        address: parsed.address as Address,
        privateKey: parsed.privateKey as `0x${string}`,
        validUntil: parsed.validUntil,
        allowedContracts: [contractAddr as Address],
      };
    } catch (error) {
      console.error("Failed to get stored session key:", error);
      return null;
    }
  }, []);

  return {
    delegationSession,
    authorizeDelegation,
    revokeDelegation,
    isDelegationValid,
    getStoredSessionKey,
  };
};
