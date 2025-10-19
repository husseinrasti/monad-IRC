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
  balance: {
    usage: "balance",
    description: "Check your Smart Account balance (this is what pays for gas)",
  },
  fund: {
    usage: "fund <amount>",
    description: "Fund your Smart Account with MON tokens for gas (requires MetaMask)",
    examples: ["fund 0.1", "fund 0.5"],
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
    description: "Disconnects your wallet and Smart Account",
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
  whoami: {
    usage: "whoami",
    description: "Display your user information from the database (username, addresses, connection details)",
  },
};

export const parseCommand = (input: string): { command: string; args: string[] } => {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  
  // Handle multi-word commands
  const multiWordCommands = [
    "connect wallet", 
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
    "  connect wallet          - Connect your MetaMask Smart Account",
    "  balance                 - Check Smart Account balance (for gas)",
    "  fund <amount>           - Fund Smart Account with MON tokens",
    "  username set <name>     - Set a custom username",
    "  username clear          - Reset username to wallet address",
    "  whoami                  - Display your user information",
    "  logout                  - Disconnect wallet",
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

