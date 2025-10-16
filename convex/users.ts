import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new user or get existing user by wallet address
 */
export const createOrGetUser = mutation({
  args: {
    walletAddress: v.string(),
    username: v.string(),
    smartAccountAddress: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    walletAddress: v.string(),
    username: v.string(),
    smartAccountAddress: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (existingUser) {
      // Update username and smart account if provided
      if (args.smartAccountAddress && existingUser.smartAccountAddress !== args.smartAccountAddress) {
        await ctx.db.patch(existingUser._id, {
          smartAccountAddress: args.smartAccountAddress,
        });
      }
      
      // Return the updated user
      const updatedUser = await ctx.db.get(existingUser._id);
      if (!updatedUser) {
        throw new Error("User not found after update");
      }
      return updatedUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      walletAddress: args.walletAddress,
      username: args.username,
      smartAccountAddress: args.smartAccountAddress,
    });

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  },
});

/**
 * Get user by wallet address
 */
export const getUserByWallet = query({
  args: {
    walletAddress: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      walletAddress: v.string(),
      username: v.string(),
      smartAccountAddress: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    return user || null;
  },
});

/**
 * Get user by username
 */
export const getUserByUsername = query({
  args: {
    username: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      walletAddress: v.string(),
      username: v.string(),
      smartAccountAddress: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    return user || null;
  },
});

