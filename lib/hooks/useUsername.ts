"use client";

import { useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export const useUsername = () => {
  const { user, setUser, addTerminalLine } = useIRC();
  
  // Convex mutations
  const updateUsernameMutation = useMutation(api.users.updateUsername);
  const resetUsernameMutation = useMutation(api.users.resetUsername);

  /**
   * Set a new username
   */
  const setUsername = useCallback(async (newUsername: string) => {
    if (!user) {
      addTerminalLine("Please connect your wallet first.", "error");
      return false;
    }

    try {
      addTerminalLine(`Setting username to "${newUsername}"...`, "info");
      
      const result = await updateUsernameMutation({
        walletAddress: user.walletAddress,
        newUsername: newUsername.trim(),
      });

      if (result.success) {
        // Update local user state
        setUser({
          ...user,
          username: result.username,
        });
        
        addTerminalLine(result.message, "system");
        return true;
      } else {
        addTerminalLine(result.message, "error");
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to update username: ${errorMessage}`, "error");
      return false;
    }
  }, [user, updateUsernameMutation, setUser, addTerminalLine]);

  /**
   * Reset username to wallet address
   */
  const clearUsername = useCallback(async () => {
    if (!user) {
      addTerminalLine("Please connect your wallet first.", "error");
      return false;
    }

    try {
      addTerminalLine("Resetting username to wallet address...", "info");
      
      const result = await resetUsernameMutation({
        walletAddress: user.walletAddress,
      });

      if (result.success) {
        // Update local user state
        setUser({
          ...user,
          username: result.username,
        });
        
        addTerminalLine(result.message, "system");
        return true;
      } else {
        addTerminalLine(result.message, "error");
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to reset username: ${errorMessage}`, "error");
      return false;
    }
  }, [user, resetUsernameMutation, setUser, addTerminalLine]);

  return {
    setUsername,
    clearUsername,
  };
};

