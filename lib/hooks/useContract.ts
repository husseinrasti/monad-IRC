"use client";

import { useState, useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { 
  type Address, 
  type Hash, 
  encodeFunctionData, 
  keccak256, 
  toHex, 
} from "viem";
import { MONAD_IRC_ABI } from "@/lib/contract/abi";
import { 
  CONTRACT_ADDRESS,
  createMonadPublicClient,
  ensureSmartAccountDeployed,
  isMetaMaskInstalled,
} from "@/lib/utils/smartAccount";
import { getGlobalSmartAccount, getGlobalBundlerClient } from "./useSmartAccount";
import {
  executeUserOperation,
  formatBundlerError,
  type RetryConfig,
} from "@/lib/utils/bundlerHelpers";

/**
 * Hook for interacting with the MonadIRC smart contract
 * Uses MetaMask Smart Account with bundler client for all transactions
 * No more session keys or signatures - direct smart account calls
 */
export const useContract = () => {
  const { addTerminalLine, user } = useIRC();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Ensure Smart Account is ready for transactions
   */
  const ensureSmartAccountReady = useCallback(async (): Promise<boolean> => {
    // Validate MetaMask
    if (!isMetaMaskInstalled()) {
      addTerminalLine("❌ MetaMask is required for transactions.", "error");
      return false;
    }

    // Get Smart Account and bundler client
    const smartAccount = getGlobalSmartAccount();
    const bundlerClient = getGlobalBundlerClient();

    if (!smartAccount) {
      addTerminalLine("❌ Smart Account not initialized. Please reconnect your wallet.", "error");
      return false;
    }

    // Check if bundler is available
    if (!bundlerClient) {
      addTerminalLine("❌ Bundler client not available.", "error"); 
      return false;
    }

    // Ensure Smart Account is deployed
    try {
      const deployed = await ensureSmartAccountDeployed(smartAccount, bundlerClient);
      if (!deployed) {
        addTerminalLine("❌ Failed to deploy Smart Account.", "error");
        return false;
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`❌ Smart Account deployment error: ${errorMessage}`, "error");
      return false;
    }
  }, [addTerminalLine]);

  /**
   * Create channel using Smart Account
   */
  const createChannel = useCallback(async (channelName: string): Promise<Hash | null> => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("❌ Please connect Smart Account first", "error");
      return null;
    }

    setIsLoading(true);
    try {
      // Ensure Smart Account is ready
      const isReady = await ensureSmartAccountReady();
      if (!isReady) {
        return null;
      }

      // Get Smart Account and clients
      const smartAccount = getGlobalSmartAccount();
      const bundlerClient = getGlobalBundlerClient();
      
      if (!smartAccount || !bundlerClient) {
        addTerminalLine("❌ Smart Account not initialized.", "error");
        return null;
      }

      addTerminalLine("Creating channel on-chain...", "info");

      // Prepare transaction data
      const data = encodeFunctionData({
        abi: MONAD_IRC_ABI,
        functionName: "createChannel",
        args: [channelName],
      });

      // Retry configuration
      const retryConfig: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      };

      // Execute user operation with retry logic
      const result = await executeUserOperation(
        bundlerClient,
        smartAccount,
        [
          {
            to: CONTRACT_ADDRESS,
            data,
            value: BigInt(0),
          },
        ],
        {
          maxFeePerGas: BigInt(200000000000), // 200 Gwei
          maxPriorityFeePerGas: BigInt(200000000000),
          timeout: 60000, // 60 seconds
          retryConfig,
          onLog: (message: string) => {
            addTerminalLine(message, "system");
          },
        }
      );

      if (result.success) {
        addTerminalLine("✅ Channel created on-chain!", "system");
        return result.transactionHash;
      } else {
        addTerminalLine(`❌ Transaction failed: ${result.error}`, "error");
        return null;
      }
    } catch (error) {
      const { message, suggestions } = formatBundlerError(error);
      
      addTerminalLine(`❌ Channel creation failed: ${message}`, "error");
      
      // Display helpful suggestions
      if (suggestions.length > 0) {
        addTerminalLine("", "info");
        suggestions.forEach(suggestion => {
          addTerminalLine(`💡 ${suggestion}`, "info");
        });
        
        // Add Smart Account address if it's a funding issue
        if (message.includes("insufficient funds") || message.includes("AA21")) {
          addTerminalLine("", "info");
          addTerminalLine(`Smart Account: ${user.smartAccountAddress}`, "info");
        }
      }
      
      console.error("Full error details:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, addTerminalLine, ensureSmartAccountReady]);

  /**
   * Send message using Smart Account
   */
  const sendMessage = useCallback(async (
    content: string,
    channelName: string
  ): Promise<Hash | null> => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("❌ User or Smart Account not found", "error");
      return null;
    }

    setIsLoading(true);
    try {
      // Ensure Smart Account is ready
      const isReady = await ensureSmartAccountReady();
      if (!isReady) {
        return null;
      }

      // Get Smart Account and clients
      const smartAccount = getGlobalSmartAccount();
      const bundlerClient = getGlobalBundlerClient();
      
      if (!smartAccount || !bundlerClient) {
        addTerminalLine("❌ Smart Account not initialized.", "error");
        return null;
      }

      // Create message hash (hash of content)
      const msgHash = keccak256(toHex(content));

      addTerminalLine("Sending message on-chain...", "info");

      // Prepare transaction data
      const data = encodeFunctionData({
        abi: MONAD_IRC_ABI,
        functionName: "sendMessage",
        args: [msgHash, channelName],
      });

      // Retry configuration
      const retryConfig: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      };

      // Execute user operation with retry logic
      const result = await executeUserOperation(
        bundlerClient,
        smartAccount,
        [
          {
            to: CONTRACT_ADDRESS,
            data,
            value: BigInt(0),
          },
        ],
        {
          maxFeePerGas: BigInt(200000000000), // 200 Gwei
          maxPriorityFeePerGas: BigInt(200000000000),
          timeout: 60000, // 60 seconds
          retryConfig,
          onLog: (message: string) => {
            addTerminalLine(message, "system");
          },
        }
      );

      if (result.success) {
        addTerminalLine("✅ Message confirmed on-chain!", "system");
        return result.transactionHash;
      } else {
        addTerminalLine(`❌ Transaction failed: ${result.error}`, "error");
        return null;
      }
    } catch (error) {
      const { message, suggestions } = formatBundlerError(error);
      
      addTerminalLine(`❌ Message send failed: ${message}`, "error");
      
      // Display helpful suggestions
      if (suggestions.length > 0) {
        addTerminalLine("", "info");
        suggestions.forEach(suggestion => {
          addTerminalLine(`💡 ${suggestion}`, "info");
        });
        
        // Add Smart Account address if it's a funding issue
        if (message.includes("insufficient funds") || message.includes("AA21")) {
          addTerminalLine("", "info");
          addTerminalLine(`Smart Account: ${user.smartAccountAddress}`, "info");
        }
      }
      
      console.error("Full error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, addTerminalLine, ensureSmartAccountReady]);

  /**
   * Check Smart Account balance
   */
  const checkSmartAccountBalance = useCallback(async () => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("❌ User or Smart Account not found", "error");
      return null;
    }

    try {
      const publicClient = createMonadPublicClient();
      const balance = await publicClient.getBalance({
        address: user.smartAccountAddress as Address,
      });
      
      const balanceInMon = Number(balance) / 1e18;
      addTerminalLine(`💰 Smart Account Balance: ${balanceInMon.toFixed(6)} MON`, "system");
      
      if (balanceInMon < 0.001) {
        addTerminalLine("", "warning");
        addTerminalLine("⚠️  Balance is very low! Fund your Smart Account to send transactions.", "warning");
        addTerminalLine("   Run: fund <amount> (e.g., fund 0.1)", "info");
      }
      
      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`❌ Failed to check balance: ${errorMessage}`, "error");
      return null;
    }
  }, [user, addTerminalLine]);

  /**
   * Fund Smart Account (helper for users)
   */
  const fundSmartAccount = useCallback(async (amountInEth: string): Promise<Hash | null> => {
    if (!user) {
      addTerminalLine("❌ User not found", "error");
      return null;
    }

    // Validate MetaMask
    if (!isMetaMaskInstalled()) {
      addTerminalLine("❌ MetaMask is required to fund Smart Account.", "error");
      return null;
    }

    try {
      const smartAccount = getGlobalSmartAccount();
      if (!smartAccount) {
        addTerminalLine("❌ Smart Account not initialized", "error");
        return null;
      }

      addTerminalLine(`Sending ${amountInEth} MON to Smart Account...`, "info");
      addTerminalLine("⚠️  Please confirm the transaction in MetaMask", "warning");

      // Request MetaMask to send transaction
      const txHash = await window.ethereum!.request({
        method: "eth_sendTransaction",
        params: [{
          from: user.walletAddress,
          to: smartAccount.address,
          value: `0x${(parseFloat(amountInEth) * 1e18).toString(16)}`,
        }],
      }) as Hash;

      addTerminalLine(`Tx hash: ${txHash}`, "system");
      addTerminalLine("Waiting for confirmation...", "info");

      const publicClient = createMonadPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      addTerminalLine("✅ Smart Account funded!", "system");
      
      return txHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User denied") || errorMessage.includes("User rejected")) {
        addTerminalLine("❌ Transaction cancelled by user.", "warning");
      } else {
        addTerminalLine(`❌ Failed to fund Smart Account: ${errorMessage}`, "error");
      }
      
      return null;
    }
  }, [user, addTerminalLine]);

  return {
    createChannel,
    sendMessage,
    checkSmartAccountBalance,
    fundSmartAccount,
    isLoading,
  };
};
