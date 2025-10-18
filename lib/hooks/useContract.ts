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
      addTerminalLine("⚠️  Monad testnet doesn't have ERC-4337 bundler support yet.", "warning");
      addTerminalLine("💡 You need to either:", "info");
      addTerminalLine("  1. Set up your own bundler service", "info");
      addTerminalLine("  2. Use a public bundler that supports Monad", "info");
      addTerminalLine("  3. Set NEXT_PUBLIC_BUNDLER_URL in your environment", "info");
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

      // Send transaction via Smart Account bundler client
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [
          {
            to: CONTRACT_ADDRESS,
            data,
            value: BigInt(0),
          },
        ],
        maxFeePerGas: BigInt(200000000000), // 200 Gwei
        maxPriorityFeePerGas: BigInt(200000000000), // 200 Gwei
      });

      addTerminalLine(`User operation hash: ${userOpHash}`, "system");
      addTerminalLine("Waiting for confirmation...", "info");

      // Wait for user operation to be included
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      
      if (receipt.success) {
        addTerminalLine("✅ Channel created on-chain!", "system");
        return receipt.receipt.transactionHash as Hash;
      } else {
        addTerminalLine("❌ Transaction failed on-chain", "error");
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`❌ Channel creation failed: ${errorMessage}`, "error");
      
      // Check for various funding-related errors
      if (errorMessage.includes("insufficient funds") || 
          errorMessage.includes("AA21") || 
          errorMessage.includes("didn't pay prefund") ||
          errorMessage.includes("does not have sufficient funds")) {
        addTerminalLine("", "error");
        addTerminalLine("⚠️  Your Smart Account needs MON tokens to pay for gas!", "error");
        addTerminalLine(`Smart Account Address: ${user.smartAccountAddress}`, "info");
        addTerminalLine("", "info");
        addTerminalLine("💡 To fund your Smart Account, run:", "info");
        addTerminalLine("   fund <amount>", "info");
        addTerminalLine("   Example: fund 0.1", "info");
        addTerminalLine("", "info");
        addTerminalLine("Or send MON directly from MetaMask to your Smart Account address.", "info");
      } else if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
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

      // Send transaction via Smart Account bundler client
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [
          {
            to: CONTRACT_ADDRESS,
            data,
            value: BigInt(0),
          },
        ],
        maxFeePerGas: BigInt(200000000000), // 200 Gwei
        maxPriorityFeePerGas: BigInt(200000000000), // 200 Gwei
      });

      addTerminalLine(`User operation hash: ${userOpHash}`, "system");

      // Wait for user operation to be included
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      
      if (receipt.success) {
        addTerminalLine("✅ Message confirmed on-chain!", "system");
        return receipt.receipt.transactionHash as Hash;
      } else {
        addTerminalLine("❌ Transaction failed on-chain", "error");
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`❌ Message send failed: ${errorMessage}`, "error");
      
      // Check for various funding-related errors
      if (errorMessage.includes("insufficient funds") || 
          errorMessage.includes("AA21") || 
          errorMessage.includes("didn't pay prefund") ||
          errorMessage.includes("does not have sufficient funds")) {
        addTerminalLine("", "error");
        addTerminalLine("⚠️  Your Smart Account needs MON tokens to pay for gas!", "error");
        addTerminalLine(`Smart Account Address: ${user.smartAccountAddress}`, "info");
        addTerminalLine("", "info");
        addTerminalLine("💡 To fund your Smart Account, run:", "info");
        addTerminalLine("   fund <amount>", "info");
        addTerminalLine("   Example: fund 0.1", "info");
        addTerminalLine("", "info");
        addTerminalLine("Or send MON directly from MetaMask to your Smart Account address.", "info");
      } else if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
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
      addTerminalLine(`   Address: ${user.smartAccountAddress}`, "info");
      
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
