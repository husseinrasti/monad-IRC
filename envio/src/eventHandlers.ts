/**
 * Event handlers for Monad IRC smart contract events
 * These handlers are triggered when events are detected on-chain
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

export const handleSessionAuthorized = async (event: SessionAuthorizedEvent, context: any) => {
  console.log('Session Authorized:', {
    smartAccount: event.smartAccount,
    sessionKey: event.sessionKey,
    expiry: event.expiry.toString(),
  });

  // Store in database
  await context.db.Sessions.insert({
    smart_account: event.smartAccount,
    session_key: event.sessionKey,
    expiry: event.expiry.toString(),
    is_authorized: true,
    timestamp: new Date(Number(event.timestamp) * 1000),
  });
};

export const handleSessionRevoked = async (event: SessionRevokedEvent, context: any) => {
  console.log('Session Revoked:', {
    smartAccount: event.smartAccount,
    sessionKey: event.sessionKey,
  });

  // Update in database
  await context.db.Sessions.update({
    smart_account: event.smartAccount,
    session_key: event.sessionKey,
    is_authorized: false,
  });
};

export const handleChannelCreated = async (event: ChannelCreatedEvent, context: any) => {
  console.log('Channel Created:', {
    channelName: event.channelName,
    creator: event.creator,
  });

  // Store in database
  await context.db.Channels.insert({
    name: event.channelName,
    creator: event.creator,
    created_at: new Date(Number(event.timestamp) * 1000),
  });
};

export const handleMessageSent = async (event: MessageSentEvent, context: any) => {
  console.log('Message Sent:', {
    msgHash: event.msgHash,
    channel: event.channel,
  });

  // Update message status in database
  await context.db.Messages.update({
    msg_hash: event.msgHash,
    status: 'confirmed',
    confirmed_at: new Date(Number(event.timestamp) * 1000),
  });
};

