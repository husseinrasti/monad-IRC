"use client";

import { useCallback, useEffect } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { api } from "@/lib/api/client";
import { Message } from "@/lib/types";

export const useMessages = () => {
  const { currentChannel, messages, addMessage, updateMessage, addTerminalLine } = useIRC();

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const fetchedMessages = await api.getChannelMessages(parseInt(channelId));
      
      fetchedMessages.forEach((msg: {
        id: number;
        channel_id: number;
        user_id: number;
        username: string;
        msg_hash: string;
        content: string;
        status: "pending" | "confirmed" | "failed";
        timestamp: string;
        tx_hash?: string;
      }) => {
        const messageObj: Message = {
          id: msg.id.toString(),
          channelId: msg.channel_id.toString(),
          userId: msg.user_id.toString(),
          username: msg.username,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          status: msg.status,
          txHash: msg.tx_hash,
          msgHash: msg.msg_hash,
        };
        addMessage(messageObj);
      });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [addMessage]);

  const sendNewMessage = useCallback(async (
    channelId: string,
    userId: string,
    content: string,
    msgHash: string,
    txHash?: string
  ) => {
    try {
      const newMessage = await api.createMessage(
        parseInt(channelId),
        parseInt(userId),
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

  useEffect(() => {
    if (currentChannel) {
      fetchMessages(currentChannel.id);
    }
  }, [currentChannel, fetchMessages]);

  return {
    messages,
    fetchMessages,
    sendNewMessage,
    updateMessage,
  };
};

