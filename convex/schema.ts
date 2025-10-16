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
    walletAddress: v.string(),
    username: v.string(),
    smartAccountAddress: v.optional(v.string()),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_username", ["username"]),

  // Sessions table for session key management
  sessions: defineTable({
    smartAccount: v.string(),
    sessionKey: v.string(),
    expiry: v.string(), // bigint as string
    isAuthorized: v.boolean(),
  })
    .index("by_smart_account", ["smartAccount"])
    .index("by_session_key", ["sessionKey"])
    .index("by_smart_account_and_session_key", ["smartAccount", "sessionKey"]),

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

