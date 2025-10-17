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
  walletAddress: string;
  username: string;
  smartAccountAddress?: string;
  convexUserId?: string; // Convex database user ID
  verificationSignature?: string; // Signature for wallet verification
  lastConnected?: Date;
}

export interface SessionKey {
  publicKey: string;
  privateKey: string;
  expiry: number;
  authorized: boolean;
  smartAccount?: string; // Smart account address linked to this session
}

export interface IRCState {
  user: User | null;
  sessionKey: SessionKey | null;
  currentChannel: Channel | null;
  channels: Channel[];
  messages: Message[];
  isConnected: boolean;
  isSessionAuthorized: boolean;
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

