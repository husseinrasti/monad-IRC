"use client";

import { useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";

export const useSessionKey = () => {
  const { sessionKey, setSessionKey, setSessionAuthorized, addTerminalLine } = useIRC();

  const generateSessionKey = useCallback(async () => {
    try {
      addTerminalLine("Generating session key...", "info");

      // Generate random session key pair (simplified for demo)
      const privateKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      
      const publicKey = `0x${Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;

      // Set expiry to 24 hours from now
      const expiry = Math.floor(Date.now() / 1000) + 86400;

      const newSessionKey = {
        publicKey,
        privateKey,
        expiry,
        authorized: false,
      };

      setSessionKey(newSessionKey);
      addTerminalLine("Session key generated successfully.", "system");
      return newSessionKey;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to generate session key: ${errorMessage}`, "error");
      return null;
    }
  }, [setSessionKey, addTerminalLine]);

  const authorizeSession = useCallback(async () => {
    if (!sessionKey) {
      addTerminalLine("No session key found. Generating new one...", "warning");
      const newKey = await generateSessionKey();
      if (!newKey) return;
    }

    try {
      addTerminalLine("Authorizing session key on-chain...", "info");
      addTerminalLine("Please confirm the transaction in MetaMask.", "warning");

      // TODO: Implement actual smart contract call
      // For now, simulate authorization
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSessionAuthorized(true);
      addTerminalLine("Session authorized successfully!", "system");
      addTerminalLine("You can now send messages without MetaMask popups.", "info");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to authorize session: ${errorMessage}`, "error");
    }
  }, [sessionKey, generateSessionKey, setSessionAuthorized, addTerminalLine]);

  const revokeSession = useCallback(() => {
    setSessionKey(null);
    setSessionAuthorized(false);
    addTerminalLine("Session key revoked.", "info");
  }, [setSessionKey, setSessionAuthorized, addTerminalLine]);

  return {
    sessionKey,
    generateSessionKey,
    authorizeSession,
    revokeSession,
  };
};

