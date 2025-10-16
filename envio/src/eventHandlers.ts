/**
 * Event handlers for Monad IRC smart contract events
 * These handlers are triggered when events are detected on-chain
 * and forward them to Convex HTTP endpoints
 */

interface SessionAuthorizedEvent {
  smartAccount: string;
  sessionKey: string;
  expiry: bigint;
  timestamp: bigint;
}

interface SessionRevokedEvent {
  smartAccount: string;
  sessionKey: string;
  timestamp: bigint;
}

interface ChannelCreatedEvent {
  channelName: string;
  creator: string;
  timestamp: bigint;
}

interface MessageSentEvent {
  msgHash: string;
  sessionKey: string;
  channel: string;
  timestamp: bigint;
}

// Get Convex webhook URL from environment or use default
const CONVEX_WEBHOOK_URL = process.env.CONVEX_WEBHOOK_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

/**
 * Helper function to call Convex HTTP endpoint
 */
const callConvexWebhook = async (endpoint: string, data: any) => {
  if (!CONVEX_WEBHOOK_URL) {
    console.error("CONVEX_WEBHOOK_URL is not set");
    return;
  }

  const url = `${CONVEX_WEBHOOK_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook call failed (${response.status}):`, errorText);
      throw new Error(`Webhook failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Webhook success (${endpoint}):`, result);
    return result;
  } catch (error) {
    console.error(`Error calling webhook (${endpoint}):`, error);
    throw error;
  }
};

export const handleSessionAuthorized = async (event: SessionAuthorizedEvent, context: any) => {
  console.log('Session Authorized:', {
    smartAccount: event.smartAccount,
    sessionKey: event.sessionKey,
    expiry: event.expiry.toString(),
  });

  try {
    await callConvexWebhook('/api/webhook/session-authorized', {
      smartAccount: event.smartAccount,
      sessionKey: event.sessionKey,
      expiry: event.expiry.toString(),
    });
  } catch (error) {
    console.error('Failed to process SessionAuthorized event:', error);
  }
};

export const handleSessionRevoked = async (event: SessionRevokedEvent, context: any) => {
  console.log('Session Revoked:', {
    smartAccount: event.smartAccount,
    sessionKey: event.sessionKey,
  });

  try {
    await callConvexWebhook('/api/webhook/session-revoked', {
      smartAccount: event.smartAccount,
      sessionKey: event.sessionKey,
    });
  } catch (error) {
    console.error('Failed to process SessionRevoked event:', error);
  }
};

export const handleChannelCreated = async (event: ChannelCreatedEvent, context: any) => {
  console.log('Channel Created:', {
    channelName: event.channelName,
    creator: event.creator,
  });

  try {
    await callConvexWebhook('/api/webhook/channel-created', {
      channelName: event.channelName,
      creator: event.creator,
      txHash: context.transaction?.hash,
    });
  } catch (error) {
    console.error('Failed to process ChannelCreated event:', error);
  }
};

export const handleMessageSent = async (event: MessageSentEvent, context: any) => {
  console.log('Message Sent:', {
    msgHash: event.msgHash,
    channel: event.channel,
  });

  try {
    await callConvexWebhook('/api/webhook/message-sent', {
      msgHash: event.msgHash,
      txHash: context.transaction?.hash,
    });
  } catch (error) {
    console.error('Failed to process MessageSent event:', error);
  }
};
