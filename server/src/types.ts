export interface User {
  id: number;
  wallet_address: string;
  username: string;
  smart_account_address?: string;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  session_pub: string;
  expiry: number;
  is_authorized: boolean;
  created_at: Date;
}

export interface Channel {
  id: number;
  name: string;
  creator: string;
  created_at: Date;
  tx_hash?: string;
}

export interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  msg_hash: string;
  content: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: Date;
  tx_hash?: string;
}

