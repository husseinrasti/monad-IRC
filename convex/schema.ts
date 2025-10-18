import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Monad IRC
 * 
 * Tables:
 * - users: Wallet-based user accounts
 * - sessions: Session keys for gasless transactions
 * - channels: IRC channels
 * - messages: Chat messages with on-chain verification
 */
export default defineSchema({
  // Users table
  users: defineTable({
    walletAddress: v.string(), // EOA wallet address from MetaMask
    username: v.string(),
    smartAccountAddress: v.optional(v.string()), // Smart Account address (computed when user connects)
    verificationSignature: v.optional(v.string()),
    lastConnected: v.optional(v.number()),
    activeSessionId: v.optional(v.id("sessions")),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_username", ["username"])
    .index("by_smart_account", ["smartAccountAddress"]),

  // Sessions table for delegation session management
  sessions: defineTable({
    smartAccount: v.string(), // Smart Account address
    sessionKey: v.string(), // Delegated signer address
    expiry: v.string(), // Expiry timestamp as string
    isAuthorized: v.boolean(), // Whether session is authorized on-chain
    userId: v.id("users"), // Link session to user
    isActive: v.boolean(), // Whether session is currently active
    lastUsed: v.optional(v.number()), // Last time session was used
  })
    .index("by_smart_account", ["smartAccount"])
    .index("by_session_key", ["sessionKey"])
    .index("by_smart_account_and_session_key", ["smartAccount", "sessionKey"])
    .index("by_user", ["userId"])
    .index("by_user_and_active", ["userId", "isActive"]),

  // Channels table
  channels: defineTable({
    name: v.string(),
    creator: v.string(), // wallet address
    txHash: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_creator", ["creator"]),

  // Messages table
  messages: defineTable({
    channelId: v.id("channels"),
    senderWallet: v.string(),
    msgHash: v.string(),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    txHash: v.optional(v.string()),
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_status", ["channelId", "status"])
    .index("by_msg_hash", ["msgHash"])
    .index("by_sender", ["senderWallet"]),
});

