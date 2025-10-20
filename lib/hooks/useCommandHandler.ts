"use client";

import { useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useSmartAccount } from "./useSmartAccount";
import { useUsername } from "./useUsername";
import { useContract } from "./useContract";
import { parseCommand, formatHelpText, getAllCommandsHelp } from "@/lib/commands/commands";
import { Channel, Message } from "@/lib/types";
import { api } from "@/lib/api/client";

/**
 * Hook for handling user commands in the IRC terminal
 * Uses MetaMask Delegation Toolkit exclusively for all Smart Account operations
 */
export const useCommandHandler = () => {
  const {
    addTerminalLine,
    clearTerminal,
    isConnected,
    currentChannel,
    setCurrentChannel,
    channels,
    addChannel,
    addMessage,
    updateMessage,
    user,
  } = useIRC();

  const { connectSmartAccount, disconnectSmartAccount } = useSmartAccount();
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
    [currentChannel, user, addMessage, updateMessage, sendMessageOnChain, addTerminalLine]
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

        case "create":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
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
          
          try {
            addTerminalLine(`Looking for channel ${joinChannelName}...`, "info");
            
            // Fetch channel directly from database
            const channelData = await api.getChannelByName(joinChannelName);
            
            if (!channelData) {
              addTerminalLine(`Channel ${joinChannelName} not found.`, "error");
              addTerminalLine("Use 'list channels' to see available channels.", "info");
              break;
            }

            // Transform to Channel type
            const channelToJoin: Channel = {
              id: channelData._id,
              name: channelData.name,
              creator: channelData.creator,
              createdAt: new Date(channelData._creationTime),
              txHash: channelData.txHash,
            };

            setCurrentChannel(channelToJoin);
            addTerminalLine(`Joined channel ${joinChannelName}`, "system");
            addTerminalLine(`Creator: ${channelToJoin.creator}`, "info");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addTerminalLine(`Failed to join channel: ${errorMessage}`, "error");
            console.error("Join channel error:", error);
          }
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
            // Fetch fresh list from Convex database
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
                const creatorShort = channel.creator.slice(0, 6) + "..." + channel.creator.slice(-4);
                
                addTerminalLine(`  ${index + 1}. ${channel.name}`, "info");
                addTerminalLine(`     Creator: ${creatorShort}`, "output");
              
                addTerminalLine("", "output");
              });
            
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

          // Disconnect Smart Account and clear state
          disconnectSmartAccount();
          setCurrentChannel(null);
          addTerminalLine("Logged out successfully.", "system");
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

        case "whoami":
          if (!isConnected) {
            addTerminalLine("Please connect your Smart Account first.", "error");
            break;
          }
          if (!user) {
            addTerminalLine("User not found. Please reconnect your Smart Account.", "error");
            break;
          }
          
          try {
            // Fetch user data from database
            const userData = await api.getUserByWallet(user.walletAddress);
            
            if (!userData) {
              addTerminalLine("User data not found in database.", "error");
              break;
            }
            
            addTerminalLine("", "output");
            addTerminalLine("═══════════════════════════════════════════════════════", "system");
            addTerminalLine("  USER INFORMATION", "system");
            addTerminalLine("═══════════════════════════════════════════════════════", "system");
            addTerminalLine("", "output");
            addTerminalLine(`  Username:        ${userData.username}`, "info");
            addTerminalLine(`  Wallet Address:  ${userData.walletAddress}`, "info");
            
            if (userData.smartAccountAddress) {
              addTerminalLine(`  Smart Account:   ${userData.smartAccountAddress}`, "info");
            }
            
            addTerminalLine("", "output");
            
            const createdDate = new Date(userData._creationTime);
            addTerminalLine(`  Account Created: ${createdDate.toLocaleString()}`, "output");
            
            if (userData.lastConnected) {
              const lastConnectedDate = new Date(userData.lastConnected);
              addTerminalLine(`  Last Connected:  ${lastConnectedDate.toLocaleString()}`, "output");
            }
            
            addTerminalLine("", "output");
            addTerminalLine("═══════════════════════════════════════════════════════", "system");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addTerminalLine(`Failed to fetch user information: ${errorMessage}`, "error");
            console.error("whoami error:", error);
          }
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
      currentChannel,
      setCurrentChannel,
      channels,
      addChannel,
      user,
      connectSmartAccount,
      disconnectSmartAccount,
      setUsername,
      clearUsername,
      handleRegularMessage,
      createChannelOnChain,
      addMessage,
      updateMessage,
      fundSmartAccount,
      checkSmartAccountBalance,
    ]
  );

  return { handleCommand };
};
