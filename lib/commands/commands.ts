import { Command } from "@/lib/types";

export const HELP_TEXTS: Record<string, { usage: string; description: string; examples?: string[] }> = {
  help: {
    usage: "help [command]",
    description: "Show a list of all available commands or detailed help for a specific command",
    examples: ["help", "help join", "help create"],
  },
  "connect wallet": {
    usage: "connect wallet",
    description: "Connects your MetaMask Smart Account via Delegation Toolkit",
  },
  "authorize session": {
    usage: "authorize session",
    description: "Authorize a session key for gasless transactions (requires MetaMask confirmation)",
  },
  create: {
    usage: "create #channelName",
    description: "Creates a new channel (on-chain + in DB)",
    examples: ["create #general", "create #monad-chat"],
  },
  join: {
    usage: "join #channelName",
    description: "Join a specific channel. Opens a new terminal window for chatting. Messages are displayed in real-time once confirmed on-chain.",
    examples: ["join #general", "join #dev"],
  },
  leave: {
    usage: "leave",
    description: "Leaves the current channel and closes its terminal",
  },
  "list channels": {
    usage: "list channels",
    description: "Lists all available channels from backend",
  },
  clear: {
    usage: "clear",
    description: "Clears the current terminal screen",
  },
  logout: {
    usage: "logout",
    description: "Ends session and clears local session keys",
  },
};

export const parseCommand = (input: string): { command: string; args: string[] } => {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  
  // Handle multi-word commands
  const multiWordCommands = ["connect wallet", "authorize session", "list channels"];
  
  for (const multiCmd of multiWordCommands) {
    const cmdParts = multiCmd.split(" ");
    const inputStart = parts.slice(0, cmdParts.length).join(" ").toLowerCase();
    
    if (inputStart === multiCmd) {
      return {
        command: multiCmd,
        args: parts.slice(cmdParts.length),
      };
    }
  }
  
  // Single word command
  return {
    command: parts[0]?.toLowerCase() || "",
    args: parts.slice(1),
  };
};

export const formatHelpText = (commandName: string): string[] => {
  const help = HELP_TEXTS[commandName];
  if (!help) {
    return [`Unknown command: ${commandName}`];
  }

  const lines = [
    `Command: ${commandName}`,
    `Usage: ${help.usage}`,
    `Description: ${help.description}`,
  ];

  if (help.examples && help.examples.length > 0) {
    lines.push("Examples:");
    help.examples.forEach((ex) => lines.push(`  ${ex}`));
  }

  return lines;
};

export const getAllCommandsHelp = (): string[] => {
  return [
    "Available Commands:",
    "",
    "  help [command]          - Show this help or help for specific command",
    "  connect wallet          - Connect your MetaMask wallet",
    "  authorize session       - Authorize session key for gasless transactions",
    "  create #channelName     - Create a new channel",
    "  join #channelName       - Join an existing channel",
    "  leave                   - Leave current channel",
    "  list channels           - List all available channels",
    "  clear                   - Clear terminal screen",
    "  logout                  - Disconnect and end session",
    "",
    "Type 'help <command>' for more details on a specific command.",
  ];
};

