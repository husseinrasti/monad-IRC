"use client";

import { useCallback, useEffect } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type Address } from "viem";
import { 
  createSessionKey,
  authorizeSessionKeyOnChain,
  isSessionKeyValid,
  revokeSessionKeyOnChain,
  type SessionKeyData,
} from "@/lib/utils/delegation";
import { createMonadPublicClient, isMetaMaskInstalled } from "@/lib/utils/smartAccount";
import { DelegationSession } from "@/lib/types";

/**
 * Hook for managing delegation sessions (session keys)
 * Uses MetaMask for authorization and stores session keys securely
 * Provides comprehensive error handling for all delegation operations
 */
export const useDelegation = () => {
  const { 
    delegationSession, 
    setDelegationSession, 
    setDelegationActive, 
    addTerminalLine,
    user,
  } = useIRC();
  
  // Convex mutations
  const authorizeSessionMutation = useMutation(api.sessions.authorizeSession);
  const deactivateSessionMutation = useMutation(api.sessions.deactivateSession);
  
  // Query user's session data
  const userWithSession = useQuery(
    api.users.getUserWithSession,
    user ? { walletAddress: user.walletAddress } : "skip"
  );

  /**
   * Restore active delegation session from Convex database
   */
  useEffect(() => {
    if (userWithSession?.activeSession && !delegationSession) {
      const session = userWithSession.activeSession;
      
      // Check if session is still valid (not expired)
      const expiry = parseInt(session.expiry);
      const now = Math.floor(Date.now() / 1000);
      
      if (session.isActive && session.isAuthorized && expiry > now) {
        // Restore delegation session (note: we don't have private key from DB)
        const restoredSession: DelegationSession = {
          sessionAddress: session.sessionKey,
          validUntil: expiry,
          allowedContracts: [process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ""],
          isActive: session.isActive,
          createdAt: new Date(session._creationTime),
        };
        
        setDelegationSession(restoredSession);
        setDelegationActive(true);
        addTerminalLine("Previous delegation session restored!", "system");
        addTerminalLine(`Session expires: ${new Date(expiry * 1000).toLocaleString()}`, "info");
      } else {
        addTerminalLine("Previous delegation session expired or inactive.", "warning");
      }
    }
  }, [userWithSession, delegationSession, setDelegationSession, setDelegationActive, addTerminalLine]);

  /**
   * Generate a new delegation session
   */
  const generateDelegationSession = useCallback(async (
    validityMinutes: number = 30
  ): Promise<SessionKeyData | null> => {
    try {
      // Validate MetaMask is installed
      if (!isMetaMaskInstalled()) {
        addTerminalLine("❌ MetaMask is required to create a delegation session.", "error");
        return null;
      }

      addTerminalLine("Generating delegation session key...", "info");

      const sessionKeyData = await createSessionKey(validityMinutes * 60 * 1000);
      
      addTerminalLine("✅ Delegation session key generated successfully.", "system");
      addTerminalLine(`Session address: ${sessionKeyData.address}`, "info");
      addTerminalLine(`Expires: ${new Date(sessionKeyData.validUntil * 1000).toLocaleString()}`, "info");
      
      return sessionKeyData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`❌ Failed to generate delegation session: ${errorMessage}`, "error");
      
      if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
      }
      
      return null;
    }
  }, [addTerminalLine]);

  /**
   * Authorize delegation session on-chain and in Convex database
   */
  const authorizeDelegation = useCallback(async () => {
    // Validate MetaMask is installed
    if (!isMetaMaskInstalled()) {
      addTerminalLine("❌ MetaMask is required to authorize a delegation session.", "error");
      addTerminalLine("Please install MetaMask from https://metamask.io", "info");
      return false;
    }

    if (!user || !user.smartAccountAddress) {
      addTerminalLine("❌ Please connect your Smart Account first.", "error");
      return false;
    }

    if (!user.convexUserId) {
      addTerminalLine("❌ User not found in database. Please reconnect.", "error");
      return false;
    }

    try {
      // Generate new session key
      addTerminalLine("Creating new delegation session...", "info");
      const sessionKeyData = await generateDelegationSession(30);
      
      if (!sessionKeyData) {
        addTerminalLine("❌ Failed to generate session key.", "error");
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

      addTerminalLine("Authorizing delegation session on-chain...", "info");
      addTerminalLine("⚠️  Please confirm the transaction in MetaMask.", "warning");

      // Authorize session on-chain
      let txHash: string | null = null;
      
      try {
        txHash = await authorizeSessionKeyOnChain(
          sessionKeyData,
          user.smartAccountAddress as Address
        );
      } catch (authError) {
        const authErrorMsg = authError instanceof Error ? authError.message : "Unknown error";
        
        if (authErrorMsg.includes("User denied") || authErrorMsg.includes("User rejected")) {
          addTerminalLine("❌ Transaction cancelled by user.", "warning");
          return false;
        }
        
        if (authErrorMsg.includes("insufficient funds")) {
          addTerminalLine("❌ Insufficient funds to pay for gas.", "error");
          addTerminalLine("Please add MON to your wallet and try again.", "info");
          return false;
        }
        
        throw authError;
      }

      if (!txHash) {
        addTerminalLine("❌ Failed to authorize delegation session on-chain.", "error");
        return false;
      }

      addTerminalLine("Transaction submitted, waiting for confirmation...", "info");
      addTerminalLine(`Tx hash: ${txHash}`, "system");

      // Wait for transaction confirmation
      const publicClient = createMonadPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      
      if (receipt.status === "success") {
        addTerminalLine("✅ Delegation session authorized on-chain!", "system");

        // Store session in Convex database
        addTerminalLine("Storing session in database...", "info");
        
        try {
          await authorizeSessionMutation({
            smartAccount: user.smartAccountAddress as `0x${string}`,
            sessionKey: sessionKeyData.address,
            expiry: sessionKeyData.validUntil.toString(),
            userId: user.convexUserId,
          });
        } catch (dbError) {
          const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown error";
          addTerminalLine(`⚠️  Warning: Failed to store session in database: ${dbErrorMsg}`, "warning");
          addTerminalLine("Session is still active on-chain but may not persist across sessions.", "info");
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

        addTerminalLine("✅ Delegation session authorized successfully!", "system");
        addTerminalLine("You can now send messages without MetaMask popups.", "info");
        
        return true;
      } else {
        addTerminalLine("❌ Transaction failed on-chain.", "error");
        addTerminalLine("Please try again or check your wallet balance.", "info");
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("MetaMask")) {
        addTerminalLine(`❌ MetaMask error: ${errorMessage}`, "error");
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
      } else {
        addTerminalLine(`❌ Failed to authorize delegation session: ${errorMessage}`, "error");
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
    authorizeSessionMutation,
  ]);

  /**
   * Revoke the current delegation session
   */
  const revokeDelegation = useCallback(async () => {
    if (!delegationSession || !user?.convexUserId || !user?.smartAccountAddress) {
      addTerminalLine("⚠️  No active delegation session to revoke.", "warning");
      return;
    }

    // Validate MetaMask is installed
    if (!isMetaMaskInstalled()) {
      addTerminalLine("❌ MetaMask is required to revoke a delegation session.", "error");
      return;
    }

    try {
      addTerminalLine("Revoking delegation session...", "info");
      addTerminalLine("⚠️  Please confirm the transaction in MetaMask.", "warning");

      // Revoke on-chain
      let txHash: string | null = null;
      
      try {
        txHash = await revokeSessionKeyOnChain(user.smartAccountAddress as Address);
      } catch (revokeError) {
        const revokeErrorMsg = revokeError instanceof Error ? revokeError.message : "Unknown error";
        
        if (revokeErrorMsg.includes("User denied") || revokeErrorMsg.includes("User rejected")) {
          addTerminalLine("❌ Transaction cancelled by user.", "warning");
          return;
        }
        
        throw revokeError;
      }
      
      if (txHash) {
        addTerminalLine(`Revocation tx hash: ${txHash}`, "system");
        
        // Wait for confirmation
        const publicClient = createMonadPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        addTerminalLine("✅ Delegation session revoked on-chain!", "system");
      }

      // Deactivate in Convex database
      if (userWithSession?.activeSession?._id) {
        try {
          await deactivateSessionMutation({
            sessionId: userWithSession.activeSession._id,
          });
        } catch (dbError) {
          const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown error";
          addTerminalLine(`⚠️  Warning: Failed to update database: ${dbErrorMsg}`, "warning");
        }
      }

      // Clear from local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("monad_irc_session_key");
      }

      // Clear local state
      setDelegationSession(null);
      setDelegationActive(false);
      
      addTerminalLine("✅ Delegation session revoked successfully.", "system");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("MetaMask")) {
        addTerminalLine(`❌ MetaMask error: ${errorMessage}`, "error");
      } else {
        addTerminalLine(`❌ Failed to revoke delegation session: ${errorMessage}`, "error");
      }
    }
  }, [
    delegationSession,
    user,
    userWithSession,
    setDelegationSession, 
    setDelegationActive, 
    addTerminalLine,
    deactivateSessionMutation,
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
