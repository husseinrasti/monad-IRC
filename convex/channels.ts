import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new channel (public mutation)
 */
export const createChannel = mutation({
  args: {
    name: v.string(),
    creator: v.string(),
    txHash: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("channels"),
    _creationTime: v.number(),
    name: v.string(),
    creator: v.string(),
    txHash: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check if channel already exists
    const existingChannel = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingChannel) {
      throw new Error("Channel already exists");
    }

    // Verify creator exists
    const creator = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.creator))
      .first();

    if (!creator) {
      throw new Error("Creator user not found");
    }

    // Create channel
    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      creator: args.creator,
      txHash: args.txHash,
    });

    const channel = await ctx.db.get(channelId);
    if (!channel) {
      throw new Error("Failed to create channel");
    }

    return channel;
  },
});

/**
 * Create a new channel (internal mutation for webhooks)
 */
export const createChannelInternal = internalMutation({
  args: {
    name: v.string(),
    creator: v.string(),
    txHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[Convex] createChannelInternal called:", {
      name: args.name,
      creator: args.creator,
      txHash: args.txHash,
    });

    // Check if channel already exists
    const existingChannel = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingChannel) {
      console.log(`[Convex] Channel ${args.name} already exists with ID: ${existingChannel._id}`);
      return null;
    }

    // Ensure creator user exists (create if not)
    let creatorUser = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.creator))
      .first();

    if (!creatorUser) {
      console.log(`[Convex] Creator user not found, creating user for: ${args.creator}`);
      const userId = await ctx.db.insert("users", {
        walletAddress: args.creator,
        username: args.creator.slice(0, 8), // Default username
      });
      console.log(`[Convex] Created user with ID: ${userId}`);
    }

    // Create channel
    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      creator: args.creator,
      txHash: args.txHash,
    });

    console.log(`[Convex] Channel created successfully:`, {
      id: channelId,
      name: args.name,
      creator: args.creator,
      txHash: args.txHash,
    });

    return null;
  },
});

/**
 * Get all channels
 */
export const getAllChannels = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      creator: v.string(),
      txHash: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const channels = await ctx.db.query("channels").order("desc").collect();
    return channels;
  },
});

/**
 * Get channel by name
 */
export const getChannelByName = query({
  args: {
    name: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      creator: v.string(),
      txHash: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    return channel || null;
  },
});

/**
 * Get channels created by a specific user
 */
export const getChannelsByCreator = query({
  args: {
    creator: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      creator: v.string(),
      txHash: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_creator", (q) => q.eq("creator", args.creator))
      .order("desc")
      .collect();

    return channels;
  },
});

