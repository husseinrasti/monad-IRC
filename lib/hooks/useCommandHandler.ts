"use client";

import { useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useSmartAccount } from "./useSmartAccount";
import { useDelegation } from "./useDelegation";
import { useUsername } from "./useUsername";
import { useContract } from "./useContract";
import { parseCommand, formatHelpText, getAllCommandsHelp } from "@/lib/commands/commands";
import { Channel, Message } from "@/lib/types";
import { api } from "@/lib/api/client";

/**
 * Hook for handling user commands in the IRC terminal
 * Updated to use Smart Account and delegation-based transactions
 */
export const useCommandHandler = () => {
  const {
    addTerminalLine,
    clearTerminal,
    isConnected,
    isDelegationActive,
    currentChannel,
    setCurrentChannel,
    channels,
    addChannel,
    addMessage,
    updateMessage,
    user,
  } = useIRC();

  const { connectSmartAccount, disconnectSmartAccount } = useSmartAccount();
  const { authorizeDelegation, revokeDelegation } = useDelegation();
  const { setUsername, clearUsername } = useUsername();
  const { 
    createChannel: createChannelOnChain, 
    sendMessage: sendMessageOnChain,
    checkSmartAccountBalance,
    fundSmartAccount,
  } = useContract();

  // Handle regular messages (non-commands)
  const handleRegularMessage = useCallback(
    async (message: string) => {
      if (!currentChannel) {
        addTerminalLine("You are not in any channel. Use 'join #channelName' first.", "error");
        return;
      }

      if (!user) {
        addTerminalLine("User not found. Please reconnect your Smart Account.", "error");
        return;
      }

      if (!isDelegationActive) {
        addTerminalLine("Please authorize delegation session first to send messages.", "error");
        return;
      }

      try {
        // Create message hash
        const msgHash = `0x${Buffer.from(message).toString("hex")}`;

        // Create message in Convex with pending status
        const newMessage = await api.sendMessage(
          currentChannel.id as any,
          user.smartAccountAddress,
          msgHash,
          message
        );

        // Add to local state
        const messageObj: Message = {
          id: newMessage._id,
          channelId: newMessage.channelId,
          userId: user.id,
          username: user.username,
          content: newMessage.content,
          timestamp: new Date(newMessage._creationTime),
          status: "pending",
          msgHash: newMessage.msgHash,
          txHash: newMessage.txHash,
        };

        addMessage(messageObj);
        addTerminalLine(`[${user.username}] ${message}`, "output");

        // Send to blockchain using delegated transaction
        const txHash = await sendMessageOnChain(message, currentChannel.name);

        if (txHash) {
          addTerminalLine("Message confirmed on-chain!", "system");
          addTerminalLine("Status will update via HyperIndex...", "info");
          
          // Note: Message status will be updated to "confirmed" by HyperIndex webhook
          // when it detects the MessageSent event
        } else {
          // If transaction failed, update status immediately
          await api.updateMessageStatus(
            messageObj.id as any,
            "failed"
          );
          
          updateMessage(messageObj.id, {
            status: "failed",
          });
          addTerminalLine("Message failed to confirm on-chain", "error");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        addTerminalLine(`Failed to send message: ${errorMessage}`, "error");
      }
    },
    [currentChannel, user, isDelegationActive, addMessage, updateMessage, sendMessageOnChain, addTerminalLine]
  );

  const handleCommand = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      // Check if it's a command or regular message
      const isCommand = input.startsWith("/") || parseCommand(input).command !== input;

      // If not a command and in a channel, treat as regular message
      if (!isCommand && currentChannel) {
        await handleRegularMessage(input);
        return;
      }

      // Echo the command
      addTerminalLine(`> ${input}`, "output");

      const { command, args } = parseCommand(input);

      switch (command) {
        case "help":
        case "man":
          if (args.length > 0) {
            const helpLines = formatHelpText(args.join(" "));
            helpLines.forEach((line) => addTerminalLine(line, "info"));
          } else {
            const helpLines = getAllCommandsHelp();
            helpLines.forEach((line) => addTerminalLine(line, "info"));
          }
          break;

        case "connect wallet":
          await connectSmartAccount();
          break;

        case "authorize session":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          await authorizeDelegation();
          break;

        case "balance":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          await checkSmartAccountBalance();
          break;

        case "fund":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          if (args.length === 0) {
            addTerminalLine("Usage: fund <amount>", "error");
            addTerminalLine("Example: fund 0.1", "info");
            addTerminalLine("", "info");
            addTerminalLine("This will send MON from your MetaMask EOA to your Smart Account.", "info");
            addTerminalLine("Your Smart Account needs MON to pay for gas on transactions.", "info");
            break;
          }
          
          const fundAmount = args[0];
          if (isNaN(parseFloat(fundAmount)) || parseFloat(fundAmount) <= 0) {
            addTerminalLine("Invalid amount. Please provide a positive number.", "error");
            break;
          }
          
          await fundSmartAccount(fundAmount);
          break;

        case "session fund":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          if (args.length === 0) {
            addTerminalLine("Usage: session fund <amount>", "error");
            addTerminalLine("Example: session fund 0.1", "info");
            addTerminalLine("This will fund your Smart Account for gas fees.", "info");
            break;
          }
          
          const amount = args[0];
          if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            addTerminalLine("Invalid amount. Please provide a positive number.", "error");
            break;
          }
          
          await fundSmartAccount(amount);
          break;

        case "create":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          if (!isDelegationActive) {
            addTerminalLine("Please authorize delegation session first.", "error");
            break;
          }
          if (args.length === 0) {
            addTerminalLine("Usage: create #channelName", "error");
            break;
          }
          if (!user) {
            addTerminalLine("User not found. Please reconnect your Smart Account.", "error");
            break;
          }
          
          const createChannelName = args[0].startsWith("#") ? args[0] : `#${args[0]}`;
          
          // Check if channel already exists
          const existingChannel = await api.getChannelByName(createChannelName);
          if (existingChannel) {
            addTerminalLine(`Channel ${createChannelName} already exists.`, "error");
            break;
          }

          addTerminalLine(`Creating channel ${createChannelName}...`, "info");
          
          try {
            // Create channel on-chain using delegated transaction
            const txHash = await createChannelOnChain(createChannelName);
            
            if (!txHash) {
              addTerminalLine("Failed to create channel on-chain.", "error");
              break;
            }

            // Transaction confirmed - HyperIndex will detect the event and update Convex
            addTerminalLine(`Channel ${createChannelName} created on-chain!`, "system");
            addTerminalLine("Channel will appear shortly via HyperIndex...", "info");
            addTerminalLine(`Type 'join ${createChannelName}' to enter the channel.`, "info");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addTerminalLine(`Failed to create channel: ${errorMessage}`, "error");
          }
          break;

        case "join":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          if (args.length === 0) {
            addTerminalLine("Usage: join #channelName", "error");
            break;
          }
          
          const joinChannelName = args[0].startsWith("#") ? args[0] : `#${args[0]}`;
          const channelToJoin = channels.find((c) => c.name === joinChannelName);
          
          if (!channelToJoin) {
            addTerminalLine(`Channel ${joinChannelName} not found.`, "error");
            addTerminalLine("Use 'list channels' to see available channels.", "info");
            break;
          }

          setCurrentChannel(channelToJoin);
          addTerminalLine(`Joined channel ${joinChannelName}`, "system");
          break;

        case "leave":
          if (!currentChannel) {
            addTerminalLine("You are not in any channel.", "error");
            break;
          }
          
          addTerminalLine(`Left channel ${currentChannel.name}`, "system");
          setCurrentChannel(null);
          break;

        case "list channels":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          
          addTerminalLine("Fetching channels from database...", "info");
          
          try {
            // Fetch fresh list from Convex
            const fetchedChannels = await api.getAllChannels();
            
            if (fetchedChannels.length === 0) {
              addTerminalLine("No channels available.", "info");
              addTerminalLine("Create one with 'create #channelName'", "info");
            } else {
              addTerminalLine("", "output");
              addTerminalLine("═══════════════════════════════════════════════════════", "system");
              addTerminalLine("  AVAILABLE CHANNELS", "system");
              addTerminalLine("═══════════════════════════════════════════════════════", "system");
              addTerminalLine("", "output");
              
              fetchedChannels.forEach((channel, index) => {
                const createdAt = new Date(channel._creationTime);
                const formattedDate = createdAt.toLocaleString();
                const creatorShort = channel.creator.slice(0, 6) + "..." + channel.creator.slice(-4);
                
                addTerminalLine(`  ${index + 1}. ${channel.name}`, "info");
                addTerminalLine(`     Creator: ${creatorShort}`, "output");
                addTerminalLine(`     Created: ${formattedDate}`, "output");
                if (channel.txHash) {
                  const txShort = channel.txHash.slice(0, 10) + "..." + channel.txHash.slice(-8);
                  addTerminalLine(`     Tx: ${txShort}`, "output");
                }
                addTerminalLine("", "output");
              });
              
              addTerminalLine("═══════════════════════════════════════════════════════", "system");
              addTerminalLine(`  Total: ${fetchedChannels.length} channel${fetchedChannels.length === 1 ? '' : 's'}`, "info");
              addTerminalLine("═══════════════════════════════════════════════════════", "system");
              addTerminalLine("", "output");
              addTerminalLine("Use 'join #channelName' to enter a channel", "info");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addTerminalLine(`Failed to fetch channels: ${errorMessage}`, "error");
            console.error("Channel fetch error:", error);
          }
          break;

        case "clear":
          clearTerminal();
          break;

        case "logout":
          if (!isConnected) {
            addTerminalLine("You are not logged in.", "error");
            break;
          }

          try {
            // If delegation is active, revoke it
            if (isDelegationActive) {
              await revokeDelegation();
            }

            // Disconnect Smart Account and clear state
            disconnectSmartAccount();
            setCurrentChannel(null);
            addTerminalLine("Logged out successfully.", "system");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addTerminalLine(`Logout failed: ${errorMessage}`, "error");
            // Still disconnect even if revocation fails
            disconnectSmartAccount();
            setCurrentChannel(null);
          }
          break;

        case "username set":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          if (args.length === 0) {
            addTerminalLine("Usage: username set <newName>", "error");
            addTerminalLine("Example: username set alice", "info");
            break;
          }
          await setUsername(args[0]);
          break;

        case "username clear":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          await clearUsername();
          break;

        default:
          addTerminalLine(`Unknown command: ${command}`, "error");
          addTerminalLine("Type 'help' to see available commands.", "info");
          break;
      }
    },
    [
      addTerminalLine,
      clearTerminal,
      isConnected,
      isDelegationActive,
      currentChannel,
      setCurrentChannel,
      channels,
      addChannel,
      user,
      connectSmartAccount,
      disconnectSmartAccount,
      authorizeDelegation,
      revokeDelegation,
      setUsername,
      clearUsername,
      handleRegularMessage,
      createChannelOnChain,
      addMessage,
      updateMessage,
      fundSmartAccount,
    ]
  );

  return { handleCommand };
};
