import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Send a message to a channel
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    senderWallet: v.string(),
    msgHash: v.string(),
    content: v.string(),
    txHash: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    senderWallet: v.string(),
    msgHash: v.string(),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    txHash: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify channel exists
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Verify sender exists
    const sender = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.senderWallet))
      .first();

    if (!sender) {
      throw new Error("Sender not found");
    }

    // Create message with pending status
    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      senderWallet: args.senderWallet,
      msgHash: args.msgHash,
      content: args.content,
      status: "pending",
      txHash: args.txHash,
    });

    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Failed to create message");
    }

    return message;
  },
});

/**
 * Get messages for a channel
 */
export const getChannelMessages = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      senderWallet: v.string(),
      msgHash: v.string(),
      content: v.string(),
      status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
      txHash: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(limit);

    return messages;
  },
});

/**
 * Get messages by channel name
 */
export const getMessagesByChannelName = query({
  args: {
    channelName: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      senderWallet: v.string(),
      msgHash: v.string(),
      content: v.string(),
      status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
      txHash: v.optional(v.string()),
      username: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Get channel by name
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", args.channelName))
      .first();

    if (!channel) {
      return [];
    }

    // Get messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
      .order("desc")
      .take(limit);

    // Enrich with username
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_wallet", (q) => q.eq("walletAddress", message.senderWallet))
          .first();

        return {
          ...message,
          username: user?.username || "Unknown",
        };
      })
    );

    return enrichedMessages;
  },
});

/**
 * Update message status (public - called by frontend after tx confirmation)
 */
export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    txHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the message
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Update status
    await ctx.db.patch(args.messageId, {
      status: args.status,
      txHash: args.txHash || message.txHash,
    });

    return null;
  },
});

/**
 * Update message status by msgHash (public - called by HyperIndex)
 */
export const updateMessageStatusFromHyperIndex = mutation({
  args: {
    msgHash: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    txHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[Convex] updateMessageStatusFromHyperIndex called:", {
      msgHash: args.msgHash,
      status: args.status,
      txHash: args.txHash,
    });

    // Find message by msgHash
    const message = await ctx.db
      .query("messages")
      .withIndex("by_msg_hash", (q) => q.eq("msgHash", args.msgHash))
      .first();

    if (!message) {
      console.error(`[Convex] Message not found for msgHash: ${args.msgHash}`);
      // Log all messages to help debug
      const allMessages = await ctx.db.query("messages").take(10);
      console.log(`[Convex] Recent messages in database:`, 
        allMessages.map(m => ({ id: m._id, msgHash: m.msgHash, status: m.status }))
      );
      return null;
    }

    console.log(`[Convex] Found message:`, {
      id: message._id,
      currentStatus: message.status,
      newStatus: args.status,
    });

    // Update status
    await ctx.db.patch(message._id, {
      status: args.status,
      txHash: args.txHash || message.txHash,
    });

    console.log(`[Convex] Message status updated successfully:`, {
      id: message._id,
      msgHash: args.msgHash,
      status: args.status,
      txHash: args.txHash || message.txHash,
    });

    return null;
  },
});

/**
 * Update message status by msgHash (internal - called by webhooks)
 */
export const updateMessageStatusByHash = internalMutation({
  args: {
    msgHash: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    txHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[Convex] updateMessageStatusByHash called:", {
      msgHash: args.msgHash,
      status: args.status,
      txHash: args.txHash,
    });

    // Find message by msgHash
    const message = await ctx.db
      .query("messages")
      .withIndex("by_msg_hash", (q) => q.eq("msgHash", args.msgHash))
      .first();

    if (!message) {
      console.error(`[Convex] Message not found for msgHash: ${args.msgHash}`);
      // Log all messages to help debug
      const allMessages = await ctx.db.query("messages").take(10);
      console.log(`[Convex] Recent messages in database:`, 
        allMessages.map(m => ({ id: m._id, msgHash: m.msgHash, status: m.status }))
      );
      return null;
    }

    console.log(`[Convex] Found message:`, {
      id: message._id,
      currentStatus: message.status,
      newStatus: args.status,
    });

    // Update status
    await ctx.db.patch(message._id, {
      status: args.status,
      txHash: args.txHash || message.txHash,
    });

    console.log(`[Convex] Message status updated successfully:`, {
      id: message._id,
      msgHash: args.msgHash,
      status: args.status,
      txHash: args.txHash || message.txHash,
    });

    return null;
  },
});

