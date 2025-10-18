"use client";

import { useEffect, useCallback, useState } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { api, convexReact } from "@/lib/api/client";
import { api as convexApi } from "../../convex/_generated/api";
import { Channel } from "@/lib/types";

export const useChannels = () => {
  const { channels, addChannel, addTerminalLine } = useIRC();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe to channels in real-time
  useEffect(() => {
    if (isSubscribed) return;

    const unsubscribe = convexReact.watchQuery(convexApi.channels.getAllChannels, {}).onUpdate(() => {
      api.getAllChannels().then((fetchedChannels) => {
        fetchedChannels.forEach((channel) => {
          const channelObj: Channel = {
            id: channel._id,
            name: channel.name,
            creator: channel.creator,
            createdAt: new Date(channel._creationTime),
            txHash: channel.txHash,
          };
          addChannel(channelObj);
        });
      }).catch((error) => {
        console.error("Failed to fetch channels:", error);
        addTerminalLine("Failed to fetch channels from server", "error");
      });
    });

    setIsSubscribed(true);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [addChannel, addTerminalLine, isSubscribed]);

  const fetchChannels = useCallback(async () => {
    try {
      const fetchedChannels = await api.getAllChannels();
      
      fetchedChannels.forEach((channel) => {
        const channelObj: Channel = {
          id: channel._id,
          name: channel.name,
          creator: channel.creator,
          createdAt: new Date(channel._creationTime),
          txHash: channel.txHash,
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
        id: newChannel._id,
        name: newChannel.name,
        creator: newChannel.creator,
        createdAt: new Date(newChannel._creationTime),
        txHash: newChannel.txHash,
      };
      
      addChannel(channelObj);
      return channelObj;
    } catch (error) {
      console.error("Failed to create channel:", error);
      addTerminalLine("Failed to create channel on server", "error");
      return null;
    }
  }, [addChannel, addTerminalLine]);

  return {
    channels,
    fetchChannels,
    createNewChannel,
  };
};

