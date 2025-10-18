/**
 * Event handlers for Monad IRC smart contract events
 * These handlers are triggered when events are detected on-chain
 * and save them to the HyperIndex database while forwarding to Convex
 */

import { 
  MonadIRC,
  Channel,
  Message,
} from "../generated";
import { S, experimental_createEffect } from "envio";

/**
 * Effect for calling Convex webhooks
 * Using the Effect API ensures proper handling during preload phase
 */
const callConvexWebhook = experimental_createEffect(
  {
    name: "callConvexWebhook",
    input: {
      endpoint: S.string,
      data: S.unknown,
    },
    output: S.unknown,
  },
  async ({ input }): Promise<{ success: boolean } | undefined> => {
    // Get Convex URL from environment
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      console.error("CONVEX_URL is not set");
      return undefined;
    }

    const url = `${convexUrl}${input.endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook call failed (${response.status}):`, errorText);
        return undefined;
      }

      const result = await response.json();
      console.log(`Webhook success (${input.endpoint}):`, result);
      return { success: true };
    } catch (error) {
      console.error(`Error calling webhook (${input.endpoint}):`, error);
      return undefined;
    }
  }
);

/**
 * Handler for ChannelCreated event
 * Triggered when a new channel is created
 */
MonadIRC.ChannelCreated.handler(async ({ event, context }) => {
  const { channelName, creator, timestamp } = event.params;

  console.log("ChannelCreated:", {
    channelName,
    creator,
    timestamp: timestamp.toString(),
  });

  // Create channel entity using channel name as ID
  const channel: Channel = {
    id: channelName,
    channelName,
    creator: creator.toLowerCase(),
    timestamp,
    createdAt: timestamp,
  };

  context.Channel.set(channel);

  // Forward to Convex (only during non-preload phase)
  if (!context.isPreload) {
    await context.effect(callConvexWebhook, {
      endpoint: "/api/webhook/channel-created",
      data: {
        channelName,
        creator: creator.toLowerCase(),
        txHash: (event.transaction as any).hash,
      },
    });
  }
});

/**
 * Handler for MessageSent event
 * Triggered when a message is sent to a channel
 */
MonadIRC.MessageSent.handler(async ({ event, context }) => {
  const { msgHash, sender, channel, timestamp } = event.params;

  console.log("MessageSent:", {
    msgHash,
    sender,
    channel,
    timestamp: timestamp.toString(),
  });

  // Create message entity
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

  // Forward to Convex (only during non-preload phase)
  if (!context.isPreload) {
    await context.effect(callConvexWebhook, {
      endpoint: "/api/webhook/message-sent",
      data: {
        msgHash,
        txHash: (event.transaction as any).hash,
      },
    });
  }
});
