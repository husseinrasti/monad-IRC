"use client";

import { useEffect, useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { api } from "@/lib/api/client";
import { Channel } from "@/lib/types";

export const useChannels = () => {
  const { channels, addChannel, addTerminalLine } = useIRC();

  const fetchChannels = useCallback(async () => {
    try {
      const fetchedChannels = await api.getAllChannels();
      
      fetchedChannels.forEach((channel: { id: string; name: string; creator: string; created_at: string; tx_hash?: string }) => {
        const channelObj: Channel = {
          id: channel.id.toString(),
          name: channel.name,
          creator: channel.creator,
          createdAt: new Date(channel.created_at),
          txHash: channel.tx_hash,
        };
        addChannel(channelObj);
      });
    } catch (error) {
      console.error("Failed to fetch channels:", error);
      addTerminalLine("Failed to fetch channels from server", "error");
    }
  }, [addChannel, addTerminalLine]);

  const createNewChannel = useCallback(async (name: string, creator: string, txHash?: string) => {
    try {
      const newChannel = await api.createChannel(name, creator, txHash);
      
      const channelObj: Channel = {
        id: newChannel.id.toString(),
        name: newChannel.name,
        creator: newChannel.creator,
        createdAt: new Date(newChannel.created_at),
        txHash: newChannel.tx_hash,
      };
      
      addChannel(channelObj);
      return channelObj;
    } catch (error) {
      console.error("Failed to create channel:", error);
      addTerminalLine("Failed to create channel on server", "error");
      return null;
    }
  }, [addChannel, addTerminalLine]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return {
    channels,
    fetchChannels,
    createNewChannel,
  };
};

