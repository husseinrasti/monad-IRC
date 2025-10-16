const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = {
  // Users
  async createOrGetUser(walletAddress: string, username: string) {
    const response = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: walletAddress, username }),
    });
    if (!response.ok) throw new Error("Failed to create/get user");
    return response.json();
  },

  async getUser(walletAddress: string) {
    const response = await fetch(`${API_URL}/api/users/${walletAddress}`);
    if (!response.ok) throw new Error("Failed to get user");
    return response.json();
  },

  // Channels
  async createChannel(name: string, creator: string, txHash?: string) {
    const response = await fetch(`${API_URL}/api/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, creator, tx_hash: txHash }),
    });
    if (!response.ok) throw new Error("Failed to create channel");
    return response.json();
  },

  async getAllChannels() {
    const response = await fetch(`${API_URL}/api/channels`);
    if (!response.ok) throw new Error("Failed to get channels");
    return response.json();
  },

  async getChannel(name: string) {
    const response = await fetch(`${API_URL}/api/channels/${name}`);
    if (!response.ok) throw new Error("Failed to get channel");
    return response.json();
  },

  // Messages
  async createMessage(
    channelId: number,
    userId: number,
    msgHash: string,
    content: string,
    txHash?: string
  ) {
    const response = await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: channelId,
        user_id: userId,
        msg_hash: msgHash,
        content,
        tx_hash: txHash,
      }),
    });
    if (!response.ok) throw new Error("Failed to create message");
    return response.json();
  },

  async getChannelMessages(channelId: number, limit = 100, offset = 0) {
    const response = await fetch(
      `${API_URL}/api/messages/channel/${channelId}?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error("Failed to get messages");
    return response.json();
  },

  async updateMessageStatus(messageId: number, status: string, txHash?: string) {
    const response = await fetch(`${API_URL}/api/messages/${messageId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, tx_hash: txHash }),
    });
    if (!response.ok) throw new Error("Failed to update message");
    return response.json();
  },
};

