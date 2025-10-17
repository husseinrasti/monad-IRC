"use client";

import { useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useWallet } from "./useWallet";
import { useSessionKey } from "./useSessionKey";
import { useUsername } from "./useUsername";
import { parseCommand, formatHelpText, getAllCommandsHelp } from "@/lib/commands/commands";
import { Channel } from "@/lib/types";

export const useCommandHandler = () => {
  const {
    addTerminalLine,
    clearTerminal,
    isConnected,
    isSessionAuthorized,
    currentChannel,
    setCurrentChannel,
    channels,
    addChannel,
    user,
  } = useIRC();

  const { connectWallet, disconnectWallet } = useWallet();
  const { authorizeSession } = useSessionKey();
  const { setUsername, clearUsername } = useUsername();

  const handleCommand = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

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
          await connectWallet();
          break;

        case "authorize session":
          if (!isConnected) {
            addTerminalLine("Please connect your wallet first.", "error");
            break;
          }
          await authorizeSession();
          break;

        case "create":
          if (!isConnected) {
            addTerminalLine("Please connect your wallet first.", "error");
            break;
          }
          if (!isSessionAuthorized) {
            addTerminalLine("Please authorize session first.", "error");
            break;
          }
          if (args.length === 0) {
            addTerminalLine("Usage: create #channelName", "error");
            break;
          }
          
          const createChannelName = args[0].startsWith("#") ? args[0] : `#${args[0]}`;
          
          // Check if channel already exists
          if (channels.find((c) => c.name === createChannelName)) {
            addTerminalLine(`Channel ${createChannelName} already exists.`, "error");
            break;
          }

          addTerminalLine(`Creating channel ${createChannelName}...`, "info");
          
          // TODO: Implement actual on-chain channel creation
          // For now, simulate
          setTimeout(() => {
            const newChannel: Channel = {
              id: `channel-${Date.now()}`,
              name: createChannelName,
              creator: user?.walletAddress || "unknown",
              createdAt: new Date(),
            };
            addChannel(newChannel);
            addTerminalLine(`Channel ${createChannelName} created successfully!`, "system");
            addTerminalLine(`Type 'join ${createChannelName}' to enter the channel.`, "info");
          }, 1500);
          break;

        case "join":
          if (!isConnected) {
            addTerminalLine("Please connect your wallet first.", "error");
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
            addTerminalLine("Please connect your wallet first.", "error");
            break;
          }
          
          if (channels.length === 0) {
            addTerminalLine("No channels available.", "info");
            addTerminalLine("Create one with 'create #channelName'", "info");
          } else {
            addTerminalLine("Available channels:", "info");
            channels.forEach((channel) => {
              addTerminalLine(`  ${channel.name} (created by ${channel.creator.slice(0, 8)}...)`, "output");
            });
          }
          break;

        case "clear":
          clearTerminal();
          break;

        case "logout":
          if (isConnected) {
            disconnectWallet();
            setCurrentChannel(null);
            addTerminalLine("Logged out successfully.", "system");
          } else {
            addTerminalLine("You are not logged in.", "error");
          }
          break;

        case "username set":
          if (!isConnected) {
            addTerminalLine("Please connect your wallet first.", "error");
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
            addTerminalLine("Please connect your wallet first.", "error");
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
      isSessionAuthorized,
      currentChannel,
      setCurrentChannel,
      channels,
      addChannel,
      user,
      connectWallet,
      disconnectWallet,
      authorizeSession,
      setUsername,
      clearUsername,
    ]
  );

  return { handleCommand };
};

