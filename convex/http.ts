import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * HTTP endpoints for HyperIndex webhook integration
 * 
 * These endpoints receive events from Envio HyperIndex and update
 * the Convex database accordingly.
 */

const http = httpRouter();

/**
 * Webhook endpoint for SessionAuthorized event
 * POST /api/webhook/session-authorized
 */
http.route({
  path: "/api/webhook/session-authorized",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json() as {
        smartAccount?: string;
        sessionKey?: string;
        expiry?: string;
      };
      const { smartAccount, sessionKey, expiry } = body;

      if (!smartAccount || !sessionKey || !expiry) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Call the internal mutation to authorize the session
      await ctx.runMutation(internal.sessions.authorizeSessionInternal, {
        smartAccount,
        sessionKey,
        expiry: expiry.toString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: "Session authorized" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error handling session-authorized webhook:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Webhook endpoint for SessionRevoked event
 * POST /api/webhook/session-revoked
 */
http.route({
  path: "/api/webhook/session-revoked",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json() as {
        smartAccount?: string;
        sessionKey?: string;
      };
      const { smartAccount, sessionKey } = body;

      if (!smartAccount || !sessionKey) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Call the internal mutation to revoke the session
      await ctx.runMutation(internal.sessions.revokeSession, {
        smartAccount,
        sessionKey,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Session revoked" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error handling session-revoked webhook:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Webhook endpoint for ChannelCreated event
 * POST /api/webhook/channel-created
 */
http.route({
  path: "/api/webhook/channel-created",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json() as {
        channelName?: string;
        creator?: string;
        txHash?: string;
      };
      const { channelName, creator, txHash } = body;

      if (!channelName || !creator) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Create the channel (internal mutation handles duplicate check)
      await ctx.runMutation(internal.channels.createChannelInternal, {
        name: channelName,
        creator,
        txHash,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Channel created" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error handling channel-created webhook:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Webhook endpoint for MessageSent event
 * POST /api/webhook/message-sent
 */
http.route({
  path: "/api/webhook/message-sent",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json() as {
        msgHash?: string;
        txHash?: string;
      };
      const { msgHash, txHash } = body;

      if (!msgHash) {
        return new Response(
          JSON.stringify({ error: "Missing msgHash" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Update message status to confirmed
      await ctx.runMutation(internal.messages.updateMessageStatus, {
        msgHash,
        status: "confirmed",
        txHash,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Message confirmed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error handling message-sent webhook:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Health check endpoint
 * GET /api/health
 */
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "monad-irc-convex",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;

