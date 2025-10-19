import type { Id } from "@/convex/_generated/dataModel";

export type MessageStatus = "pending" | "confirmed" | "failed";

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  txHash?: string;
  msgHash?: string;
}

export interface Channel {
  id: string;
  name: string;
  creator: string;
  createdAt: Date;
  txHash?: string;
}

export interface User {
  id: string;
  walletAddress: string; // EOA wallet address from MetaMask
  username: string;
  smartAccountAddress: string; // Smart Account address (required)
  convexUserId?: Id<"users">; // Convex database user ID
  verificationSignature?: string; // Signature for wallet verification
  lastConnected?: Date;
}

export interface IRCState {
  user: User | null;
  currentChannel: Channel | null;
  channels: Channel[];
  messages: Message[];
  isConnected: boolean;
  isWalletMonitoring: boolean; // Track if we're monitoring wallet state
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  examples?: string[];
  handler: (args: string[]) => Promise<void> | void;
}

export interface TerminalLine {
  id: string;
  content: string;
  type: "output" | "error" | "info" | "warning" | "system";
  timestamp: Date;
}

