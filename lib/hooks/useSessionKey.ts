"use client";

import { useCallback, useEffect } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useContract } from "./useContract";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ethers } from "ethers";

export const useSessionKey = () => {
  const { 
    sessionKey, 
    setSessionKey, 
    setSessionAuthorized, 
    addTerminalLine,
    user,
  } = useIRC();
  
  const { isLoading: isContractLoading } = useContract();
  
  // Convex mutations
  const authorizeSessionMutation = useMutation(api.sessions.authorizeSession);
  const deactivateSessionMutation = useMutation(api.sessions.deactivateSession);
  
  // Query user's session data
  const userWithSession = useQuery(
    api.users.getUserWithSession,
    user ? { walletAddress: user.walletAddress } : "skip"
  );

  /**
   * Restore active session from Convex database
   */
  useEffect(() => {
    if (userWithSession?.activeSession && !sessionKey) {
      const session = userWithSession.activeSession;
      
      // Check if session is still valid (not expired)
      const expiry = parseInt(session.expiry);
      const now = Math.floor(Date.now() / 1000);
      
      if (session.isActive && session.isAuthorized && expiry > now) {
        // Restore session key (note: we don't have private key from DB, so this is read-only)
        const restoredSessionKey = {
          publicKey: session.sessionKey,
          privateKey: "", // Private key is not stored in DB for security
          expiry: expiry,
          authorized: session.isAuthorized,
          smartAccount: session.smartAccount,
        };
        
        setSessionKey(restoredSessionKey);
        setSessionAuthorized(true);
        addTerminalLine("Previous session restored!", "system");
        addTerminalLine(`Session expires: ${new Date(expiry * 1000).toLocaleString()}`, "info");
      } else {
        addTerminalLine("Previous session expired or inactive.", "warning");
      }
    }
  }, [userWithSession, sessionKey, setSessionKey, setSessionAuthorized, addTerminalLine]);

  /**
   * Generate a new session key pair
   */
  const generateSessionKey = useCallback(async () => {
    try {
      addTerminalLine("Generating session key...", "info");

      // Generate a random wallet for the session key
      const sessionWallet = ethers.Wallet.createRandom();
      const publicKey = sessionWallet.address;
      const privateKey = sessionWallet.privateKey;
      
      // Set expiry to 24 hours from now
      const expiry = Math.floor(Date.now() / 1000) + 86400;

      const newSessionKey = {
        publicKey,
        privateKey,
        expiry,
        authorized: false,
        smartAccount: user?.smartAccountAddress || user?.walletAddress,
      };

      setSessionKey(newSessionKey);
      addTerminalLine("Session key generated successfully.", "system");
      addTerminalLine(`Session public key: ${publicKey}`, "info");
      addTerminalLine(`Expires: ${new Date(expiry * 1000).toLocaleString()}`, "info");
      
      return newSessionKey;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to generate session key: ${errorMessage}`, "error");
      return null;
    }
  }, [setSessionKey, addTerminalLine, user]);

  /**
   * Authorize session on-chain and in Convex database
   */
  const authorizeSession = useCallback(async () => {
    if (!user) {
      addTerminalLine("Please connect your wallet first.", "error");
      return false;
    }

    if (!user.convexUserId) {
      addTerminalLine("User not found in database. Please reconnect.", "error");
      return false;
    }

    let currentSessionKey = sessionKey;
    
    // Generate session key if not exists
    if (!currentSessionKey) {
      addTerminalLine("No session key found. Generating new one...", "warning");
      currentSessionKey = await generateSessionKey();
      if (!currentSessionKey) return false;
    }

    try {
      addTerminalLine("Authorizing session key on-chain...", "info");
      addTerminalLine("Please confirm the transaction in MetaMask.", "warning");

      if (!window.ethereum) {
        addTerminalLine("MetaMask not found.", "error");
        return false;
      }

      // Get the provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get the contract
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
      if (!contractAddress) {
        addTerminalLine("Contract address not configured.", "error");
        return false;
      }

      const MONAD_IRC_ABI = (await import("@/lib/contract/abi")).MONAD_IRC_ABI;
      const contract = new ethers.Contract(contractAddress, MONAD_IRC_ABI, signer);

      // Call authorizeSession on the smart contract
      const tx = await contract.authorizeSession(
        currentSessionKey.publicKey,
        currentSessionKey.expiry
      );

      addTerminalLine("Transaction submitted, waiting for confirmation...", "info");
      addTerminalLine(`Tx hash: ${tx.hash}`, "system");

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        addTerminalLine("Session authorized on-chain!", "system");

        // Store session in Convex database
        addTerminalLine("Storing session in database...", "info");
        
        const smartAccount = user.smartAccountAddress || user.walletAddress;
        
        await authorizeSessionMutation({
          smartAccount: smartAccount,
          sessionKey: currentSessionKey.publicKey,
          expiry: currentSessionKey.expiry.toString(),
          userId: user.convexUserId,
        });

        // Update session state
        const updatedSessionKey = {
          ...currentSessionKey,
          authorized: true,
          smartAccount,
        };
        
        setSessionKey(updatedSessionKey);
        setSessionAuthorized(true);

        addTerminalLine("Session authorized successfully!", "system");
        addTerminalLine("You can now send messages without MetaMask popups.", "info");
        
        return true;
      } else {
        addTerminalLine("Transaction failed on-chain.", "error");
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User denied")) {
        addTerminalLine("Transaction cancelled by user.", "warning");
      } else {
        addTerminalLine(`Failed to authorize session: ${errorMessage}`, "error");
      }
      
      return false;
    }
  }, [
    sessionKey, 
    user,
    generateSessionKey, 
    setSessionKey,
    setSessionAuthorized, 
    addTerminalLine,
    authorizeSessionMutation,
  ]);

  /**
   * Revoke the current session
   */
  const revokeSession = useCallback(async () => {
    if (!sessionKey || !user?.convexUserId) {
      addTerminalLine("No active session to revoke.", "warning");
      return;
    }

    try {
      addTerminalLine("Revoking session...", "info");

      // Deactivate in Convex database
      if (userWithSession?.activeSession?._id) {
        await deactivateSessionMutation({
          sessionId: userWithSession.activeSession._id,
        });
      }

      // Clear local state
      setSessionKey(null);
      setSessionAuthorized(false);
      
      addTerminalLine("Session revoked successfully.", "system");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to revoke session: ${errorMessage}`, "error");
    }
  }, [
    sessionKey,
    user,
    userWithSession,
    setSessionKey, 
    setSessionAuthorized, 
    addTerminalLine,
    deactivateSessionMutation,
  ]);

  /**
   * Check if session is still valid
   */
  const isSessionValid = useCallback((): boolean => {
    if (!sessionKey || !sessionKey.authorized) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return sessionKey.expiry > now;
  }, [sessionKey]);

  return {
    sessionKey,
    generateSessionKey,
    authorizeSession,
    revokeSession,
    isSessionValid,
    isLoading: isContractLoading,
  };
};
