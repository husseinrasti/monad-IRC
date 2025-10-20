/**
 * Event handlers for Monad IRC smart contract events
 * These handlers are triggered when events are detected on-chain
 * and save them to the HyperIndex database and sync to Convex
 */

import { 
  MonadIRC,
  Channel,
  Message,
} from "../generated";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

/**
 * Initialize Convex client
 */
let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient | null {
  if (convexClient) {
    return convexClient;
  }

  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.error("[Convex] CONVEX_URL is not set");
    return null;
  }

  try {
    convexClient = new ConvexHttpClient(convexUrl);
    console.log("[Convex] Client initialized:", convexUrl);
    return convexClient;
  } catch (error) {
    console.error("[Convex] Failed to initialize client:", error);
    return null;
  }
}

/**
 * Helper to send data to Convex mutations
 */
async function sendToConvex(functionRef: any, data: any): Promise<{ success: boolean; result?: any; error?: string }> {
  const client = getConvexClient();
  
  if (!client) {
    console.error("[Convex] Client not available");
    return { success: false, error: "Client not initialized" };
  }

  try {
    const result = await client.mutation(functionRef, data);
    console.log("[Convex] Mutation success:", { 
      function: functionRef._functionName,
      data,
      result 
    });
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Convex] Mutation failed:", {
      function: functionRef._functionName,
      data,
      error: errorMessage,
      fullError: error
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Handler for ChannelCreated event
 * Triggered when a new channel is created
 */
MonadIRC.ChannelCreated.handler(async ({ event, context }) => {
  const { channelName, creator, timestamp } = event.params;

  console.log("[HyperIndex] ChannelCreated:", {
    channelName,
    creator,
    timestamp: timestamp.toString(),
    txHash: (event.transaction as any).hash,
  });

  // Create channel entity in HyperIndex
  const channel: Channel = {
    id: channelName,
    channelName,
    creator: creator.toLowerCase(),
    timestamp,
    createdAt: timestamp,
  };

  context.Channel.set(channel);

  // Sync to Convex (only during non-preload phase)
  if (!context.isPreload) {
    const { success, result, error } = await sendToConvex(api.channels.createChannelFromHyperIndex, {
      name: channelName,
      creator: creator.toLowerCase(),
      txHash: (event.transaction as any).hash,
    });
    
    console.log("[HyperIndex -> Convex] Channel sync result:", {
      channelName,
      success,
      result,
      error,
    });
  }
});

/**
 * Handler for MessageSent event
 * Triggered when a message is sent to a channel
 */
MonadIRC.MessageSent.handler(async ({ event, context }) => {
  const { msgHash, sender, channel, timestamp } = event.params;

  console.log("[HyperIndex] MessageSent:", {
    msgHash,
    sender,
    channel,
    timestamp: timestamp.toString(),
    txHash: (event.transaction as any).hash,
  });

  // Create message entity in HyperIndex
  const messageId = msgHash;
  const message: Message = {
    id: messageId,
    msgHash,
    sender: sender.toLowerCase(),
    channel,
    timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: (event.transaction as any).hash,
  };

  context.Message.set(message);

  // Sync to Convex (only during non-preload phase)
  if (!context.isPreload) {
    const { success, result, error } = await sendToConvex(api.messages.updateMessageStatusFromHyperIndex, {
      msgHash,
      status: "confirmed",
      txHash: (event.transaction as any).hash,
    });
    
    console.log("[HyperIndex -> Convex] Message sync result:", {
      msgHash,
      success,
      result,
      error,
    });
  }
});
