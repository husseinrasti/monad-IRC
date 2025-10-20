import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";

// These imports will work once you run: npx convex dev
import { api as convexApi } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Initialize Convex client
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const convex = new ConvexHttpClient(CONVEX_URL);
const convexReact = new ConvexReactClient(CONVEX_URL);

/**
 * API client for Monad IRC using Convex backend
 * 
 * This replaces the old REST API client with Convex functions
 * 
 * Note: Run `npx convex dev` to generate the required types
 */
export const monadIrcApi = {
  // Users
  async createOrGetUser(walletAddress: string, username: string, smartAccountAddress: string) {
    return await convex.mutation(convexApi.users.createOrGetUser, {
      walletAddress,
      username,
      smartAccountAddress,
    });
  },

  async getUserByWallet(walletAddress: string) {
    return await convex.query(convexApi.users.getUserByWallet, {
      walletAddress,
    });
  },

  async getUserBySmartAccount(smartAccountAddress: string) {
    return await convex.query(convexApi.users.getUserBySmartAccount, {
      smartAccountAddress,
    });
  },

  async getUserByUsername(username: string) {
    return await convex.query(convexApi.users.getUserByUsername, {
      username,
    });
  },

  // Channels
  async createChannel(name: string, creator: string, txHash?: string) {
    return await convex.mutation(convexApi.channels.createChannel, {
      name,
      creator,
      txHash,
    });
  },

  async getAllChannels() {
    return await convex.query(convexApi.channels.getAllChannels, {});
  },

  async getChannelByName(name: string) {
    return await convex.query(convexApi.channels.getChannelByName, {
      name,
    });
  },

  async getChannelsByCreator(creator: string) {
    return await convex.query(convexApi.channels.getChannelsByCreator, {
      creator,
    });
  },

  // Messages
  async sendMessage(
    channelId: Id<"channels">,
    senderWallet: string,
    msgHash: string,
    content: string,
    txHash?: string
  ) {
    return await convex.mutation(convexApi.messages.sendMessage, {
      channelId,
      senderWallet,
      msgHash,
      content,
      txHash,
    });
  },

  async getChannelMessages(channelId: Id<"channels">, limit?: number) {
    return await convex.query(convexApi.messages.getChannelMessages, {
      channelId,
      limit,
    });
  },

  async getMessagesByChannelName(channelName: string, limit?: number) {
    return await convex.query(convexApi.messages.getMessagesByChannelName, {
      channelName,
      limit,
    });
  },

  async updateMessageStatus(
    messageId: Id<"messages">,
    status: "pending" | "confirmed" | "failed",
    txHash?: string
  ) {
    return await convex.mutation(convexApi.messages.updateMessageStatus, {
      messageId,
      status,
      txHash,
    });
  },

};

// Export with a clear name
export const api = monadIrcApi;

// Export the Convex client instance for advanced usage (subscriptions, etc.)
export { convex, convexReact };

// Export types for convenience
export type { Id };
