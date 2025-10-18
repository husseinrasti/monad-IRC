import { Command } from "@/lib/types";

export const HELP_TEXTS: Record<string, { usage: string; description: string; examples?: string[] }> = {
  help: {
    usage: "help [command]",
    description: "Show a list of all available commands or detailed help for a specific command",
    examples: ["help", "help join", "help create"],
  },
  man: {
    usage: "man [command]",
    description: "Alias for 'help' - show a list of all available commands or detailed help for a specific command",
    examples: ["man", "man join", "man create"],
  },
  "connect wallet": {
    usage: "connect wallet",
    description: "Connects your MetaMask Smart Account via Delegation Toolkit",
  },
  "authorize session": {
    usage: "authorize session",
    description: "Authorize a session key for gasless transactions (requires MetaMask confirmation)",
  },
  "session balance": {
    usage: "session balance",
    description: "Check session key wallet balance (needs MON for gas)",
  },
  "session fund": {
    usage: "session fund <amount>",
    description: "Fund session key wallet with MON for gas (requires MetaMask)",
    examples: ["session fund 0.1", "session fund 0.5"],
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
  "username set": {
    usage: "username set <newName>",
    description: "Set a custom username (3-20 characters: letters, numbers, _, -)",
    examples: ["username set alice", "username set bob_123"],
  },
  "username clear": {
    usage: "username clear",
    description: "Reset username to your wallet address",
  },
};

export const parseCommand = (input: string): { command: string; args: string[] } => {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  
  // Handle multi-word commands
  const multiWordCommands = [
    "connect wallet", 
    "authorize session",
    "session balance",
    "session fund",
    "list channels",
    "username set",
    "username clear",
  ];
  
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
    "Wallet & Account:",
    "  connect wallet          - Connect your MetaMask wallet",
    "  authorize session       - Authorize session key for gasless transactions",
    "  session balance         - Check session key wallet balance",
    "  session fund <amount>   - Fund session key wallet with MON for gas",
    "  username set <name>     - Set a custom username",
    "  username clear          - Reset username to wallet address",
    "  logout                  - Disconnect and end session",
    "",
    "Channels:",
    "  create #channelName     - Create a new channel",
    "  join #channelName       - Join an existing channel",
    "  leave                   - Leave current channel",
    "  list channels           - List all available channels",
    "",
    "Utility:",
    "  help [command]          - Show this help or help for specific command",
    "  man [command]           - Alias for 'help'",
    "  clear                   - Clear terminal screen",
    "",
    "Type 'help <command>' or 'man <command>' for more details on a specific command.",
  ];
};

