"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { api, convexReact } from "@/lib/api/client";
import { api as convexApi } from "../../convex/_generated/api";
import { Message } from "@/lib/types";
import { shortenAddress } from "@/lib/utils";

export const useMessages = () => {
  const { currentChannel, messages, addMessage, addMessages, updateMessage, addTerminalLine, user } = useIRC();
  const subscribedChannelIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const addMessagesRef = useRef(addMessages);
  
  // Keep ref updated
  useEffect(() => {
    addMessagesRef.current = addMessages;
  }, [addMessages]);

  // Subscribe to messages in real-time for current channel
  useEffect(() => {
    // If no channel or already subscribed to this channel, do nothing
    if (!currentChannel || subscribedChannelIdRef.current === currentChannel.id) return;

    // Cleanup previous subscription if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const channelId = currentChannel.id;
    subscribedChannelIdRef.current = channelId;
    
    const unsubscribe = convexReact
      .watchQuery(convexApi.messages.getChannelMessages, { 
        channelId: channelId as any,
        limit: 100 
      })
      .onUpdate(async () => {
        try {
          const fetchedMessages = await api.getChannelMessages(channelId as any, 100);
          
          // Process all messages in parallel
          const messagePromises = fetchedMessages.map(async (msg) => {
            const msgUser = await api.getUserBySmartAccount(msg.senderWallet).catch(() => null);
            
            return {
              id: msg._id,
              channelId: msg.channelId,
              userId: msgUser?._id || "unknown",
              username: msgUser?.username || shortenAddress(msg.senderWallet),
              content: msg.content,
              timestamp: new Date(msg._creationTime),
              status: msg.status,
              txHash: msg.txHash,
              msgHash: msg.msgHash,
              senderWallet: msg.senderWallet,
            } as Message;
          });
          
          const processedMessages = await Promise.all(messagePromises);
          
          // Add all messages in a single batch update using ref
          addMessagesRef.current(processedMessages);
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      subscribedChannelIdRef.current = null;
    };
  }, [currentChannel]);

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const fetchedMessages = await api.getChannelMessages(channelId as any, 100);
      
      for (const msg of fetchedMessages) {
        // Get user by Smart Account address
        const msgUser = await api.getUserBySmartAccount(msg.senderWallet);
        
        const messageObj: Message = {
          id: msg._id,
          channelId: msg.channelId,
          userId: msgUser?._id || "unknown",
          username: msgUser?.username || shortenAddress(msg.senderWallet),
          content: msg.content,
          timestamp: new Date(msg._creationTime),
          status: msg.status,
          txHash: msg.txHash,
          msgHash: msg.msgHash,
          senderWallet: msg.senderWallet,
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

