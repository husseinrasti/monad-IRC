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
  },
  returns: v.object({
    _id: v.id("sessions"),
    _creationTime: v.number(),
    smartAccount: v.string(),
    sessionKey: v.string(),
    expiry: v.string(),
    isAuthorized: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check if session already exists
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
      });

      const updatedSession = await ctx.db.get(existingSession._id);
      if (!updatedSession) {
        throw new Error("Failed to update session");
      }
      return updatedSession;
    }

    // Create new session
    const sessionId = await ctx.db.insert("sessions", {
      smartAccount: args.smartAccount,
      sessionKey: args.sessionKey,
      expiry: args.expiry,
      isAuthorized: true,
    });

    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Failed to create session");
    }

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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if session already exists
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
      });
      return null;
    }

    // Create new session
    await ctx.db.insert("sessions", {
      smartAccount: args.smartAccount,
      sessionKey: args.sessionKey,
      expiry: args.expiry,
      isAuthorized: true,
    });

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

