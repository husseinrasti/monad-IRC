import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Authorize a session key (public mutation for user-initiated authorization)
 */
export const authorizeSession = mutation({
  args: {
    smartAccount: v.string(),
    sessionKey: v.string(),
    expiry: v.string(),
    userId: v.id("users"),
  },
  returns: v.object({
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
  handler: async (ctx, args) => {
    // Deactivate any existing sessions for this user
    const existingSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, { isActive: false });
    }

    // Check if session already exists for this smart account and key
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_smart_account_and_session_key", (q) =>
        q.eq("smartAccount", args.smartAccount).eq("sessionKey", args.sessionKey)
      )
      .first();

    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        expiry: args.expiry,
        isAuthorized: true,
        isActive: true,
        lastUsed: Date.now(),
      });

      const updatedSession = await ctx.db.get(existingSession._id);
      if (!updatedSession) {
        throw new Error("Failed to update session");
      }
      
      // Update user's active session reference
      await ctx.db.patch(args.userId, {
        activeSessionId: updatedSession._id,
      });

      return updatedSession;
    }

    // Create new session
    const sessionId = await ctx.db.insert("sessions", {
      smartAccount: args.smartAccount,
      sessionKey: args.sessionKey,
      expiry: args.expiry,
      isAuthorized: true,
      userId: args.userId,
      isActive: true,
      lastUsed: Date.now(),
    });

    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Failed to create session");
    }

    // Update user's active session reference
    await ctx.db.patch(args.userId, {
      activeSessionId: sessionId,
    });

    return session;
  },
});

/**
 * Authorize a session key (internal mutation for webhooks)
 */
export const authorizeSessionInternal = internalMutation({
  args: {
    smartAccount: v.string(),
    sessionKey: v.string(),
    expiry: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // If userId not provided, try to find user by smart account or wallet address
    let userId = args.userId;
    if (!userId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_wallet", (q) => q.eq("walletAddress", args.smartAccount))
        .first();
      
      if (user) {
        userId = user._id;
      } else {
        // If no user found, we can't link the session
        console.warn(`No user found for smart account: ${args.smartAccount}`);
        // Create session without user link for now
      }
    }

    // Check if session already exists
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_smart_account_and_session_key", (q) =>
        q.eq("smartAccount", args.smartAccount).eq("sessionKey", args.sessionKey)
      )
      .first();

    if (existingSession) {
      // Update existing session
      const updates: Record<string, unknown> = {
        expiry: args.expiry,
        isAuthorized: true,
        isActive: true,
        lastUsed: Date.now(),
      };
      
      if (userId && existingSession.userId !== userId) {
        updates.userId = userId;
      }
      
      await ctx.db.patch(existingSession._id, updates);
      
      // Update user's active session if userId available
      if (userId) {
        await ctx.db.patch(userId, {
          activeSessionId: existingSession._id,
        });
      }
      
      return null;
    }

    // Create new session - only if we have a userId
    if (!userId) {
      console.error("Cannot create session without userId");
      return null;
    }
    
    const sessionId = await ctx.db.insert("sessions", {
      smartAccount: args.smartAccount,
      sessionKey: args.sessionKey,
      expiry: args.expiry,
      isAuthorized: true,
      userId: userId,
      isActive: true,
      lastUsed: Date.now(),
    });

    // Update user's active session if userId available
    if (userId) {
      await ctx.db.patch(userId, {
        activeSessionId: sessionId,
      });
    }

    return null;
  },
});

/**
 * Revoke a session key (internal - called by webhooks)
 */
export const revokeSession = internalMutation({
  args: {
    smartAccount: v.string(),
    sessionKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_smart_account_and_session_key", (q) =>
        q.eq("smartAccount", args.smartAccount).eq("sessionKey", args.sessionKey)
      )
      .first();

    if (!session) {
      console.error(`Session not found: ${args.smartAccount} - ${args.sessionKey}`);
      return null;
    }

    await ctx.db.patch(session._id, {
      isAuthorized: false,
    });

    return null;
  },
});

/**
 * Get session by smart account and session key
 */
export const getSession = query({
  args: {
    smartAccount: v.string(),
    sessionKey: v.string(),
  },
  returns: v.union(
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
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_smart_account_and_session_key", (q) =>
        q.eq("smartAccount", args.smartAccount).eq("sessionKey", args.sessionKey)
      )
      .first();

    return session || null;
  },
});

/**
 * Get all sessions for a smart account
 */
export const getSessionsBySmartAccount = query({
  args: {
    smartAccount: v.string(),
  },
  returns: v.array(
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
    })
  ),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_smart_account", (q) => q.eq("smartAccount", args.smartAccount))
      .order("desc")
      .collect();

    return sessions;
  },
});

/**
 * Deactivate a session
 */
export const deactivateSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      isActive: false,
    });
    return null;
  },
});

