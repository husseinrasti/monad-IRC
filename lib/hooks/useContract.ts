"use client";

import { useState, useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { 
  type Address, 
  type Hash, 
  encodeFunctionData, 
  keccak256, 
  toHex, 
  encodeAbiParameters, 
  parseAbiParameters,
  concat,
  toBytes,
  hexToBytes,
} from "viem";
import { MONAD_IRC_ABI } from "@/lib/contract/abi";
import { 
  CONTRACT_ADDRESS,
  createMonadPublicClient,
  ensureSmartAccountDeployed,
  isMetaMaskInstalled,
} from "@/lib/utils/smartAccount";
import { 
  createSessionKeyWalletClient,
  getNonce,
  type SessionKeyData,
} from "@/lib/utils/delegation";
import { useDelegation } from "./useDelegation";
import { getGlobalSmartAccount, getGlobalBundlerClient } from "./useSmartAccount";
import { monadTestnet } from "@/lib/utils/monadChain";

/**
 * Hook for interacting with the MonadIRC smart contract
 * Uses MetaMask Smart Account with bundler client for all transactions
 * Supports session keys for gasless signing
 */
export const useContract = () => {
  const { addTerminalLine, user, isDelegationActive } = useIRC();
  const { getStoredSessionKey } = useDelegation();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create domain-bound hash matching contract's _domainHash function
   * keccak256(abi.encode(block.chainid, address(this), payload))
   */
  const createDomainHash = useCallback((payload: `0x${string}`): `0x${string}` => {
    const chainId = BigInt(monadTestnet.id);
    const contractAddr = CONTRACT_ADDRESS;
    
    // Encode exactly as Solidity does: abi.encode(uint256, address, bytes)
    const encoded = encodeAbiParameters(
      parseAbiParameters("uint256, address, bytes"),
      [chainId, contractAddr, payload]
    );
    
    return keccak256(encoded);
  }, []);

  /**
   * Add EIP-191 prefix to hash (matching Solidity's toEthSignedMessageHash)
   * "\x19Ethereum Signed Message:\n32" + hash
   */
  const addEIP191Prefix = useCallback((hash: `0x${string}`): `0x${string}` => {
    const prefix = "\x19Ethereum Signed Message:\n32";
    const prefixBytes = toBytes(prefix);
    const hashBytes = hexToBytes(hash);
    const combined = concat([prefixBytes, hashBytes]);
    return keccak256(combined);
  }, []);

  /**
   * Get the session key wallet client for signing delegated transactions
   */
  const getSessionKeyWallet = useCallback((): ReturnType<typeof createSessionKeyWalletClient> | null => {
    const sessionKeyData = getStoredSessionKey();
    if (!sessionKeyData) {
      addTerminalLine("❌ No session key found. Please authorize a delegation session first.", "error");
      return null;
    }
    return createSessionKeyWalletClient(sessionKeyData);
  }, [getStoredSessionKey, addTerminalLine]);

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

    if (!smartAccount || !bundlerClient) {
      addTerminalLine("❌ Smart Account not initialized. Please reconnect your wallet.", "error");
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
   * Create channel using Smart Account (NO MetaMask popup)
   */
  const createChannel = useCallback(async (channelName: string): Promise<Hash | null> => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("❌ Please connect Smart Account first", "error");
      return null;
    }

    if (!isDelegationActive) {
      addTerminalLine("❌ Please authorize delegation session first", "error");
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

      const publicClient = createMonadPublicClient();

      // Get nonce from contract
      const nonce = await getNonce(publicClient, user.smartAccountAddress as Address);
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      // Calculate channelId exactly as contract does: keccak256(abi.encodePacked(channelName))
      const channelId = keccak256(toHex(channelName));

      // Create payload exactly as contract does:
      // abi.encode("CREATE_CHANNEL", channelId, nonce, timestamp, smartAccount)
      const payload = encodeAbiParameters(
        parseAbiParameters("string, bytes32, uint256, uint256, address"),
        ["CREATE_CHANNEL", channelId, nonce, timestamp, user.smartAccountAddress as Address]
      );

      // Create domain-bound digest
      const digest = createDomainHash(payload);

      // Add EIP-191 prefix (matching toEthSignedMessageHash)
      const ethSignedHash = addEIP191Prefix(digest);

      // Get session key wallet for signing
      const sessionWallet = getSessionKeyWallet();
      if (!sessionWallet || !sessionWallet.account) {
        addTerminalLine("❌ Failed to get session key wallet", "error");
        return null;
      }

      const account = sessionWallet.account;
      if (!account.sign) {
        addTerminalLine("❌ Session wallet account cannot sign", "error");
        return null;
      }

      // Sign the hash directly (don't use signMessage as it adds prefix again)
      const signature = await account.sign({
        hash: ethSignedHash,
      });

      addTerminalLine("Creating channel on-chain (no MetaMask popup)...", "info");

      // Prepare transaction data
      const data = encodeFunctionData({
        abi: MONAD_IRC_ABI,
        functionName: "createChannelSigned",
        args: [channelName, nonce, timestamp, user.smartAccountAddress as Address, signature],
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
        maxFeePerGas: BigInt(1000000000), // 1 Gwei
        maxPriorityFeePerGas: BigInt(1000000000), // 1 Gwei
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
      
      if (errorMessage.includes("insufficient funds")) {
        addTerminalLine("⚠️  Smart Account needs more MON for gas!", "error");
        addTerminalLine("Send MON to your Smart Account address.", "info");
      } else if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
      }
      
      console.error("Full error details:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, isDelegationActive, getSessionKeyWallet, createDomainHash, addEIP191Prefix, addTerminalLine, ensureSmartAccountReady]);

  /**
   * Send message using Smart Account (NO MetaMask popup)
   */
  const sendMessage = useCallback(async (
    content: string,
    channelName: string
  ): Promise<Hash | null> => {
    if (!user || !user.smartAccountAddress) {
      addTerminalLine("❌ User or Smart Account not found", "error");
      return null;
    }

    if (!isDelegationActive) {
      addTerminalLine("❌ Please authorize delegation session first", "error");
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

      const publicClient = createMonadPublicClient();

      // Get nonce from contract
      const nonce = await getNonce(publicClient, user.smartAccountAddress as Address);
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      // Create message hash (hash of content)
      const msgHash = keccak256(toHex(content));

      // Calculate channelId exactly as contract does
      const channelId = keccak256(toHex(channelName));

      // Create payload exactly as contract does:
      // abi.encode("SEND_MESSAGE", msgHash, channelId, nonce, timestamp, smartAccount)
      const payload = encodeAbiParameters(
        parseAbiParameters("string, bytes32, bytes32, uint256, uint256, address"),
        ["SEND_MESSAGE", msgHash, channelId, nonce, timestamp, user.smartAccountAddress as Address]
      );

      // Create domain-bound digest
      const digest = createDomainHash(payload);

      // Add EIP-191 prefix
      const ethSignedHash = addEIP191Prefix(digest);

      // Get session key wallet for signing
      const sessionWallet = getSessionKeyWallet();
      if (!sessionWallet || !sessionWallet.account) {
        addTerminalLine("❌ Failed to get session key wallet", "error");
        return null;
      }

      const account = sessionWallet.account;
      if (!account || !account.sign) {
        addTerminalLine("❌ Session wallet account cannot sign", "error");
        return null;
      }

      // Sign the hash directly
      const signature = await account.sign({
        hash: ethSignedHash,
      });

      addTerminalLine("Sending message on-chain (no MetaMask popup)...", "info");

      // Prepare transaction data
      const data = encodeFunctionData({
        abi: MONAD_IRC_ABI,
        functionName: "sendMessageSigned",
        args: [msgHash, channelId, nonce, timestamp, user.smartAccountAddress as Address, signature],
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
        maxFeePerGas: BigInt(1000000000), // 1 Gwei
        maxPriorityFeePerGas: BigInt(1000000000), // 1 Gwei
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
      
      if (errorMessage.includes("insufficient funds")) {
        addTerminalLine("⚠️  Smart Account needs more MON for gas!", "error");
        addTerminalLine("Send MON to your Smart Account address.", "info");
      } else if (errorMessage.includes("MetaMask")) {
        addTerminalLine("Please ensure MetaMask is installed and unlocked.", "info");
      }
      
      console.error("Full error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, isDelegationActive, getSessionKeyWallet, createDomainHash, addEIP191Prefix, addTerminalLine, ensureSmartAccountReady]);

  /**
   * Check session key wallet balance (for informational purposes)
   */
  const checkSessionKeyBalance = useCallback(async () => {
    const sessionKeyData = getStoredSessionKey();
    if (!sessionKeyData) {
      addTerminalLine("❌ No session key found", "error");
      return null;
    }

    try {
      const publicClient = createMonadPublicClient();
      const balance = await publicClient.getBalance({
        address: sessionKeyData.address,
      });
      
      const balanceInEth = Number(balance) / 1e18;
      addTerminalLine(`Session key balance: ${balanceInEth.toFixed(6)} MON`, "info");
      addTerminalLine("Note: Transactions are sent via Smart Account, not session key.", "info");
      
      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`❌ Failed to check balance: ${errorMessage}`, "error");
      return null;
    }
  }, [getStoredSessionKey, addTerminalLine]);

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
    checkSessionKeyBalance,
    fundSmartAccount,
    isLoading,
  };
};
