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
  ALCHEMY_POLICY_ID,
  createMonadPublicClient,
  isMetaMaskInstalled,
  isSmartAccountDeployed,
} from "@/lib/utils/smartAccount";
import { 
  getGlobalSmartAccount, 
  getGlobalPublicClient,
  getGlobalBundlerClient,
  getGlobalPaymasterClient,
} from "./useSmartAccount";

/**
 * Hook for interacting with the MonadIRC smart contract
 * 
 * Architecture (following the example pattern):
 * 1. Get Smart Account and clients from global storage
 * 2. Encode function data using viem's encodeFunctionData
 * 3. Create transaction calls array
 * 4. Send user operation via bundlerClient.sendUserOperation
 * 5. Wait for receipt via bundlerClient.waitForUserOperationReceipt
 * 6. Optional: Use paymaster for gasless transactions
 */
export const useContract = () => {
  const { addTerminalLine, user } = useIRC();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Ensure Smart Account and Alchemy bundler are ready for transactions
   */
  const ensureSmartAccountReady = useCallback(async (): Promise<boolean> => {
    // Validate MetaMask
    if (!isMetaMaskInstalled()) {
      addTerminalLine("MetaMask is required for transactions.", "error");
      return false;
    }

    // Get Smart Account
    const smartAccount = getGlobalSmartAccount();

    if (!smartAccount) {
      addTerminalLine("Smart Account not initialized. Please reconnect your wallet.", "error");
      return false;
    }

    // Get bundler client
    const bundlerClient = getGlobalBundlerClient();
    
    if (!bundlerClient) {
      addTerminalLine("Alchemy bundler not configured.", "error");
      addTerminalLine("Set NEXT_PUBLIC_ALCHEMY_API_KEY in your .env.local file", "info");
      return false;
    }

    return true;
  }, [addTerminalLine]);

  /**
   * Create channel transaction following the example pattern
   * Pattern: createChannel(publicClient, channelName, smartAccount)
   */
  const createChannelWithSmartAccount = useCallback(async (
    channelName: string
  ): Promise<Hash | null> => {
    const publicClient = getGlobalPublicClient();
    const smartAccount = getGlobalSmartAccount();
    const bundlerClient = getGlobalBundlerClient();
    const paymasterClient = getGlobalPaymasterClient();

    if (!publicClient || !smartAccount || !bundlerClient) {
      addTerminalLine("Smart Account not initialized", "error");
      return null;
    }

    try {

      // Encode transaction data
      const createChannelTxData = [];
      const createChannelTx = {
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: MONAD_IRC_ABI,
          functionName: "createChannel",
          args: [channelName],
        }),
      };
      createChannelTxData.push(createChannelTx);

      // Send user operation with optional paymaster
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: createChannelTxData,
        ...(paymasterClient && ALCHEMY_POLICY_ID && {
          paymaster: paymasterClient,
          paymasterContext: {
            policyId: ALCHEMY_POLICY_ID,
          },
        }),
      });

      addTerminalLine("Waiting for confirmation...", "info");

      // Wait for user operation receipt
      const createChannelReceipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      return createChannelReceipt.receipt.transactionHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Channel creation failed`, "error");
      
      // Provide helpful error messages
      if (errorMessage.includes("insufficient funds") || errorMessage.includes("AA21")) {
        addTerminalLine("Your Smart Account needs funds. Run 'fund <amount>' to add MON tokens.", "info");
      } else if (errorMessage.includes("User denied") || errorMessage.includes("User rejected")) {
        addTerminalLine("Please approve the transaction in MetaMask.", "info");
      } else if (errorMessage.includes("AA23") || errorMessage.includes("reverted")) {
        addTerminalLine("Transaction reverted. This channel might already exist.", "info");
      }
      
      console.error("Full error:", error);
      return null;
    }
  }, [addTerminalLine]);

  /**
   * Create channel using Smart Account
   * Public interface wrapper for the transaction
   */
  const createChannel = useCallback(async (channelName: string): Promise<Hash | null> => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("Please connect Smart Account first", "error");
      return null;
    }

    setIsLoading(true);
    try {
      const isReady = await ensureSmartAccountReady();
      if (!isReady) {
        return null;
      }

      const txHash = await createChannelWithSmartAccount(channelName);
      
      if (txHash) {
        addTerminalLine("Channel created on-chain!", "system");
        addTerminalLine(`   Tx: ${txHash}`, "info");
        return txHash;
      }
      
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to create channel`, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, addTerminalLine, ensureSmartAccountReady, createChannelWithSmartAccount]);

  /**
   * Send message transaction following the example pattern
   * Pattern: sendMessage(publicClient, content, channelName, smartAccount)
   */
  const sendMessageWithSmartAccount = useCallback(async (
    content: string,
    channelName: string
  ): Promise<Hash | null> => {
    const publicClient = getGlobalPublicClient();
    const smartAccount = getGlobalSmartAccount();
    const bundlerClient = getGlobalBundlerClient();
    const paymasterClient = getGlobalPaymasterClient();

    if (!publicClient || !smartAccount || !bundlerClient) {
      addTerminalLine("Smart Account not initialized", "error");
      return null;
    }

    try {
      addTerminalLine("Sending message on-chain...", "info");

      // Create message hash
      const msgHash = keccak256(toHex(content));

      // Encode transaction data
      const sendMessageTxData = [];
      const sendMessageTx = {
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: MONAD_IRC_ABI,
          functionName: "sendMessage",
          args: [msgHash, channelName],
        }),
      };
      sendMessageTxData.push(sendMessageTx);

      // Send user operation with optional paymaster
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: sendMessageTxData,
        ...(paymasterClient && ALCHEMY_POLICY_ID && {
          paymaster: paymasterClient,
          paymasterContext: {
            policyId: ALCHEMY_POLICY_ID,
          },
        }),
      });

      addTerminalLine("Waiting for confirmation...", "info");

      // Wait for user operation receipt
      const sendMessageReceipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      return sendMessageReceipt.receipt.transactionHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Message send failed`, "error");
      
      // Provide helpful error messages
      if (errorMessage.includes("insufficient funds") || errorMessage.includes("AA21")) {
        addTerminalLine("Your Smart Account needs funds. Run 'fund <amount>' to add MON tokens.", "info");
      } else if (errorMessage.includes("User denied") || errorMessage.includes("User rejected")) {
        addTerminalLine("Please approve the transaction in MetaMask.", "info");
      }
      
      console.error("Full error:", error);
      return null;
    }
  }, [addTerminalLine]);

  /**
   * Send message using Smart Account
   * Public interface wrapper for the transaction
   */
  const sendMessage = useCallback(async (
    content: string,
    channelName: string
  ): Promise<Hash | null> => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("User or Smart Account not found", "error");
      return null;
    }

    setIsLoading(true);
    try {
      const isReady = await ensureSmartAccountReady();
      if (!isReady) {
        return null;
      }

      const txHash = await sendMessageWithSmartAccount(content, channelName);
      
      if (txHash) {
        addTerminalLine("Message confirmed on-chain!", "system");
        addTerminalLine(`   Tx: ${txHash}`, "info");
        return txHash;
      }
      
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to send message`, "error");
      console.error("Full error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, addTerminalLine, ensureSmartAccountReady, sendMessageWithSmartAccount]);

  /**
   * Check Smart Account balance
   */
  const checkSmartAccountBalance = useCallback(async () => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("User or Smart Account not found", "error");
      return null;
    }

    try {
      const publicClient = createMonadPublicClient();
      const balance = await publicClient.getBalance({
        address: user.smartAccountAddress as Address,
      });
      
      const balanceInMon = Number(balance) / 1e18;
      addTerminalLine(`Smart Account Balance: ${balanceInMon.toFixed(6)} MON`, "system");
      
      if (balanceInMon < 0.001) {
        addTerminalLine("", "warning");
        addTerminalLine("  Balance is very low! Fund your Smart Account to send transactions.", "warning");
        addTerminalLine("  Run: fund <amount> (e.g., fund 0.1)", "info");
      }
      
      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Failed to check balance`, "error");
      console.error("Full error:", errorMessage);
      return null;
    }
  }, [user, addTerminalLine]);

  /**
   * Fund Smart Account (helper for users)
   */
  const fundSmartAccount = useCallback(async (amountInEth: string): Promise<Hash | null> => {
    if (!user) {
      addTerminalLine("User not found", "error");
      return null;
    }

    // Validate MetaMask
    if (!isMetaMaskInstalled()) {
      addTerminalLine("MetaMask is required to fund Smart Account.", "error");
      return null;
    }

    try {
      const smartAccount = getGlobalSmartAccount();
      if (!smartAccount) {
        addTerminalLine("Smart Account not initialized", "error");
        return null;
      }

      addTerminalLine(`Sending ${amountInEth} MON to Smart Account...`, "info");
      addTerminalLine("Please confirm the transaction in MetaMask", "warning");

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
      
      addTerminalLine("Smart Account funded!", "system");
      
      return txHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User denied") || errorMessage.includes("User rejected")) {
        addTerminalLine("Transaction cancelled by user.", "warning");
      } else {
        addTerminalLine(`Failed to fund Smart Account: ${errorMessage}`, "error");
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
