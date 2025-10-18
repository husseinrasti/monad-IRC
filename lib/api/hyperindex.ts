/**
 * HyperIndex GraphQL client for querying indexed on-chain events
 * 
 * This module provides typed GraphQL queries to fetch data from the
 * Envio HyperIndex instead of directly querying the blockchain.
 * 
 * Benefits:
 * - Much faster than RPC calls
 * - Historical data readily available
 * - Complex queries with filtering and sorting
 * - Real-time updates via subscriptions (if enabled)
 */

const HYPERINDEX_URL = process.env.NEXT_PUBLIC_HYPERINDEX_URL || "http://localhost:8080";

/**
 * Generic GraphQL query function
 */
async function queryHyperIndex<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(HYPERINDEX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HyperIndex query failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Channel type from HyperIndex
 */
export interface Channel {
  id: string;
  channelId: string;
  channelName: string;
  creator: string;
  timestamp: string;
  txMeta: string;
  createdAt: string;
}

/**
 * Message type from HyperIndex
 */
export interface Message {
  id: string;
  msgHash: string;
  smartAccount: string;
  sessionKey: string;
  channelId: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
}

/**
 * Session type from HyperIndex
 */
export interface Session {
  id: string;
  smartAccount: string;
  sessionKey: string;
  expiry: string;
  timestamp: string;
  isAuthorized: boolean;
  lastUpdated: string;
}

/**
 * Get all channels
 */
export async function getChannels(): Promise<Channel[]> {
  const query = `
    query GetChannels {
      Channel {
        id
        channelId
        channelName
        creator
        timestamp
        txMeta
        createdAt
      }
    }
  `;

  const result = await queryHyperIndex<{ Channel: Channel[] }>(query);
  return result.Channel || [];
}

/**
 * Get a specific channel by ID
 */
export async function getChannelById(channelId: string): Promise<Channel | null> {
  const query = `
    query GetChannel($id: ID!) {
      Channel(where: { id: $id }) {
        id
        channelId
        channelName
        creator
        timestamp
        txMeta
        createdAt
      }
    }
  `;

  const result = await queryHyperIndex<{ Channel: Channel[] }>(query, { id: channelId });
  return result.Channel?.[0] || null;
}

/**
 * Get recent messages for a channel
 */
export async function getChannelMessages(
  channelId: string,
  limit: number = 50
): Promise<Message[]> {
  const query = `
    query GetChannelMessages($channelId: String!, $limit: Int!) {
      Message(
        where: { channelId: $channelId }
        orderBy: { timestamp: desc }
        limit: $limit
      ) {
        id
        msgHash
        smartAccount
        sessionKey
        channelId
        timestamp
        blockNumber
        transactionHash
      }
    }
  `;

  const result = await queryHyperIndex<{ Message: Message[] }>(query, {
    channelId,
    limit,
  });
  return result.Message || [];
}

/**
 * Get all recent messages across all channels
 */
export async function getRecentMessages(limit: number = 100): Promise<Message[]> {
  const query = `
    query GetRecentMessages($limit: Int!) {
      Message(orderBy: { timestamp: desc }, limit: $limit) {
        id
        msgHash
        smartAccount
        sessionKey
        channelId
        timestamp
        blockNumber
        transactionHash
      }
    }
  `;

  const result = await queryHyperIndex<{ Message: Message[] }>(query, { limit });
  return result.Message || [];
}

/**
 * Get active sessions for a smart account
 */
export async function getActiveSession(smartAccount: string): Promise<Session | null> {
  const query = `
    query GetActiveSession($smartAccount: String!) {
      Session(
        where: { smartAccount: $smartAccount, isAuthorized: true }
      ) {
        id
        smartAccount
        sessionKey
        expiry
        timestamp
        isAuthorized
        lastUpdated
      }
    }
  `;

  const result = await queryHyperIndex<{ Session: Session[] }>(query, {
    smartAccount: smartAccount.toLowerCase(),
  });
  return result.Session?.[0] || null;
}

/**
 * Get all active sessions
 */
export async function getActiveSessions(): Promise<Session[]> {
  const query = `
    query GetActiveSessions {
      Session(where: { isAuthorized: true }) {
        id
        smartAccount
        sessionKey
        expiry
        timestamp
        isAuthorized
        lastUpdated
      }
    }
  `;

  const result = await queryHyperIndex<{ Session: Session[] }>(query);
  return result.Session || [];
}

/**
 * Check if indexer is running and healthy
 */
export async function checkIndexerHealth(): Promise<boolean> {
  try {
    const query = `
      query Health {
        Channel(limit: 1) {
          id
        }
      }
    `;

    await queryHyperIndex<{ Channel: Channel[] }>(query);
    return true;
  } catch (error) {
    console.error("HyperIndex health check failed:", error);
    return false;
  }
}

/**
 * Subscribe to new messages (WebSocket - requires Envio subscription support)
 * Note: This is a placeholder. Actual implementation requires WebSocket setup.
 */
export function subscribeToMessages(
  channelId: string,
  onMessage: (message: Message) => void
): () => void {
  // TODO: Implement WebSocket subscription when Envio supports it
  console.warn("Message subscriptions not yet implemented. Use polling as fallback.");
  
  // Fallback: Poll every 2 seconds
  const interval = setInterval(async () => {
    const messages = await getChannelMessages(channelId, 1);
    if (messages.length > 0) {
      onMessage(messages[0]);
    }
  }, 2000);

  return () => clearInterval(interval);
}

