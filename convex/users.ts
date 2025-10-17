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
    verificationSignature: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    walletAddress: v.string(),
    username: v.string(),
    smartAccountAddress: v.optional(v.string()),
    verificationSignature: v.optional(v.string()),
    lastConnected: v.optional(v.number()),
    activeSessionId: v.optional(v.id("sessions")),
  }),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (existingUser) {
      // Update user data
      const updates: Record<string, unknown> = {
        lastConnected: Date.now(),
      };
      
      if (args.smartAccountAddress && existingUser.smartAccountAddress !== args.smartAccountAddress) {
        updates.smartAccountAddress = args.smartAccountAddress;
      }
      
      if (args.verificationSignature) {
        updates.verificationSignature = args.verificationSignature;
      }
      
      await ctx.db.patch(existingUser._id, updates);
      
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
      verificationSignature: args.verificationSignature,
      lastConnected: Date.now(),
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
      verificationSignature: v.optional(v.string()),
      lastConnected: v.optional(v.number()),
      activeSessionId: v.optional(v.id("sessions")),
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
      verificationSignature: v.optional(v.string()),
      lastConnected: v.optional(v.number()),
      activeSessionId: v.optional(v.id("sessions")),
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

/**
 * Get user with active session
 */
export const getUserWithSession = query({
  args: {
    walletAddress: v.string(),
  },
  returns: v.union(
    v.object({
      user: v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        walletAddress: v.string(),
        username: v.string(),
        smartAccountAddress: v.optional(v.string()),
        verificationSignature: v.optional(v.string()),
        lastConnected: v.optional(v.number()),
        activeSessionId: v.optional(v.id("sessions")),
      }),
      activeSession: v.union(
        v.object({
          _id: v.id("sessions"),
          _creationTime: v.number(),
          smartAccount: v.string(),
          sessionKey: v.string(),
          expiry: v.string(),
          isAuthorized: v.boolean(),
          userId: v.id("users"),
          isActive: v.optional(v.boolean()),
          lastUsed: v.optional(v.number()),
        }),
        v.null()
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!user) {
      return null;
    }

    let activeSession = null;
    if (user.activeSessionId) {
      activeSession = await ctx.db.get(user.activeSessionId);
    }

    return {
      user,
      activeSession,
    };
  },
});

/**
 * Update user's active session
 */
export const updateActiveSession = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.union(v.id("sessions"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      activeSessionId: args.sessionId || undefined,
    });
    return null;
  },
});

/**
 * Update user's username
 */
export const updateUsername = mutation({
  args: {
    walletAddress: v.string(),
    newUsername: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    username: v.string(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get user by wallet address
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!user) {
      return {
        success: false,
        username: "",
        message: "User not found",
      };
    }

    // Check if username is already taken by another user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.newUsername))
      .first();

    if (existingUser && existingUser._id !== user._id) {
      return {
        success: false,
        username: user.username,
        message: `Username "${args.newUsername}" is already taken`,
      };
    }

    // Validate username (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(args.newUsername)) {
      return {
        success: false,
        username: user.username,
        message: "Username must be 3-20 characters (letters, numbers, _, -)",
      };
    }

    // Update username
    await ctx.db.patch(user._id, {
      username: args.newUsername,
    });

    return {
      success: true,
      username: args.newUsername,
      message: `Username updated to "${args.newUsername}"`,
    };
  },
});

/**
 * Reset username to wallet address
 */
export const resetUsername = mutation({
  args: {
    walletAddress: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    username: v.string(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get user by wallet address
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!user) {
      return {
        success: false,
        username: "",
        message: "User not found",
      };
    }

    // Reset to wallet address
    const defaultUsername = args.walletAddress;

    await ctx.db.patch(user._id, {
      username: defaultUsername,
    });

    return {
      success: true,
      username: defaultUsername,
      message: "Username reset to wallet address",
    };
  },
});

