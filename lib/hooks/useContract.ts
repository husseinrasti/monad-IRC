"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { MONAD_IRC_ABI } from "@/lib/contract/abi";
import { useIRC } from "@/lib/context/IRCContext";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "";

export const useContract = () => {
  const { addTerminalLine, user, sessionKey } = useIRC();
  const [isLoading, setIsLoading] = useState(false);

  const getProvider = useCallback(() => {
    if (window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  const getContract = useCallback(async (withSigner = false) => {
    const provider = getProvider();
    
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, MONAD_IRC_ABI, signer);
    }
    
    return new ethers.Contract(CONTRACT_ADDRESS, MONAD_IRC_ABI, provider);
  }, [getProvider]);

  const authorizeSession = useCallback(async () => {
    if (!sessionKey || !user) {
      addTerminalLine("Session key or user not found", "error");
      return null;
    }

    setIsLoading(true);
    try {
      const contract = await getContract(true);
      const tx = await contract.authorizeSession(
        sessionKey.publicKey,
        sessionKey.expiry
      );

      addTerminalLine("Transaction submitted, waiting for confirmation...", "info");
      addTerminalLine(`Tx hash: ${tx.hash}`, "system");

      const receipt = await tx.wait();
      addTerminalLine("Session authorized on-chain!", "system");
      
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Authorization failed: ${errorMessage}`, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionKey, user, getContract, addTerminalLine]);

  const createChannel = useCallback(async (channelName: string) => {
    if (!user) {
      addTerminalLine("Please connect wallet first", "error");
      return null;
    }

    setIsLoading(true);
    try {
      const contract = await getContract(true);
      const tx = await contract.createChannel(channelName);

      addTerminalLine("Creating channel on-chain...", "info");
      addTerminalLine(`Tx hash: ${tx.hash}`, "system");

      const receipt = await tx.wait();
      addTerminalLine("Channel created on-chain!", "system");
      
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Channel creation failed: ${errorMessage}`, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, getContract, addTerminalLine]);

  const sendMessage = useCallback(async (
    msgHash: string,
    channel: string,
    signature: string
  ) => {
    if (!user || !sessionKey) {
      addTerminalLine("User or session key not found", "error");
      return null;
    }

    setIsLoading(true);
    try {
      const contract = await getContract(true);
      
      // Get nonce
      const nonce = await contract.getNonce(user.walletAddress);
      const timestamp = Math.floor(Date.now() / 1000);

      const tx = await contract.sendMessageSigned(
        msgHash,
        channel,
        nonce,
        timestamp,
        user.walletAddress,
        signature
      );

      addTerminalLine("Sending message on-chain...", "info");

      const receipt = await tx.wait();
      addTerminalLine("Message confirmed on-chain!", "system");
      
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addTerminalLine(`Message send failed: ${errorMessage}`, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionKey, getContract, addTerminalLine]);

  const isSessionValid = useCallback(async (smartAccount: string) => {
    try {
      const contract = await getContract(false);
      return await contract.isSessionValid(smartAccount);
    } catch (error) {
      console.error("Failed to check session validity:", error);
      return false;
    }
  }, [getContract]);

  return {
    authorizeSession,
    createChannel,
    sendMessage,
    isSessionValid,
    isLoading,
  };
};

