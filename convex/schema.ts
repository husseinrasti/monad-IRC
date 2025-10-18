import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Monad IRC
 * 
 * Simplified schema for Account Abstraction with MetaMask Delegation
 * No session management - handled by MetaMask Delegation SDK + Pimlico
 * 
 * Tables:
 * - users: Wallet-based user accounts
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
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_username", ["username"])
    .index("by_smart_account", ["smartAccountAddress"]),

  // Channels table
  channels: defineTable({
    name: v.string(),
    creator: v.string(), // smart account address
    txHash: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_creator", ["creator"]),

  // Messages table
  messages: defineTable({
    channelId: v.id("channels"),
    senderWallet: v.string(), // smart account address
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
