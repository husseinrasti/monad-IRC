"use client";

import { useCallback, useEffect, useState } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { api, convexReact } from "@/lib/api/client";
import { api as convexApi } from "../../convex/_generated/api";
import { Message } from "@/lib/types";

export const useMessages = () => {
  const { currentChannel, messages, addMessage, updateMessage, addTerminalLine, user } = useIRC();
  const [subscribedChannelId, setSubscribedChannelId] = useState<string | null>(null);

  // Subscribe to messages in real-time for current channel
  useEffect(() => {
    if (!currentChannel || subscribedChannelId === currentChannel.id) return;

    const unsubscribe = convexReact
      .watchQuery(convexApi.messages.getChannelMessages, { 
        channelId: currentChannel.id as any,
        limit: 100 
      })
      .onUpdate(() => {
        api
          .getChannelMessages(currentChannel.id as any, 100)
          .then((fetchedMessages) => {
            fetchedMessages.forEach((msg) => {
              // Get username from user or fallback to wallet address
              api.getUserByWallet(msg.senderWallet).then((msgUser) => {
                const messageObj: Message = {
                  id: msg._id,
                  channelId: msg.channelId,
                  userId: msgUser?._id || "unknown",
                  username: msgUser?.username || msg.senderWallet.slice(0, 8),
                  content: msg.content,
                  timestamp: new Date(msg._creationTime),
                  status: msg.status,
                  txHash: msg.txHash,
                  msgHash: msg.msgHash,
                };
                addMessage(messageObj);
              }).catch(console.error);
            });
          })
          .catch((error) => {
            console.error("Failed to fetch messages:", error);
          });
      });

    setSubscribedChannelId(currentChannel.id);

    return () => {
      unsubscribe();
      setSubscribedChannelId(null);
    };
  }, [currentChannel, subscribedChannelId, addMessage]);

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const fetchedMessages = await api.getChannelMessages(channelId as any, 100);
      
      for (const msg of fetchedMessages) {
        const msgUser = await api.getUserByWallet(msg.senderWallet);
        
        const messageObj: Message = {
          id: msg._id,
          channelId: msg.channelId,
          userId: msgUser?._id || "unknown",
          username: msgUser?.username || msg.senderWallet.slice(0, 8),
          content: msg.content,
          timestamp: new Date(msg._creationTime),
          status: msg.status,
          txHash: msg.txHash,
          msgHash: msg.msgHash,
        };
        addMessage(messageObj);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [addMessage]);

  const sendNewMessage = useCallback(async (
    channelId: string,
    senderWallet: string,
    content: string,
    msgHash: string,
    txHash?: string
  ) => {
    try {
      const newMessage = await api.sendMessage(
        channelId as any,
        senderWallet,
        msgHash,
        content,
        txHash
      );

      return newMessage;
    } catch (error) {
      console.error("Failed to send message:", error);
      addTerminalLine("Failed to send message to server", "error");
      return null;
    }
  }, [addTerminalLine]);

  return {
    messages,
    fetchMessages,
    sendNewMessage,
    updateMessage,
  };
};

