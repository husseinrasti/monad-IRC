"use client";

import { useEffect, useRef, useState } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import TerminalInput from "./TerminalInput";
import { formatTimestamp } from "@/lib/utils";
import { Message } from "@/lib/types";

const ChannelTerminal = () => {
  const { currentChannel, messages, user, addMessage, addTerminalLine } = useIRC();
  const [channelMessages, setChannelMessages] = useState<Message[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentChannel) {
      const filtered = messages.filter((msg) => msg.channelId === currentChannel.id);
      setChannelMessages(filtered);
    }
  }, [messages, currentChannel]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [channelMessages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentChannel || !user) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      channelId: currentChannel.id,
      userId: user.id,
      username: user.username,
      content,
      timestamp: new Date(),
      status: "pending",
    };

    addMessage(newMessage);
    addTerminalLine(`Message sent to ${currentChannel.name}`, "info");

    // TODO: Implement actual on-chain message sending
    // For now, simulate confirmation
    setTimeout(() => {
      const confirmedMessage: Message = {
        ...newMessage,
        status: "confirmed",
        txHash: `0x${Math.random().toString(16).slice(2)}`,
      };
      addMessage(confirmedMessage);
    }, 2000);
  };

  if (!currentChannel) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-terminal-bg border-2 border-terminal-border crt-effect">
      <div className="scanline" />
      
      {/* Header */}
      <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/80">
        <h2 className="text-terminal-text terminal-glow font-bold">
          {currentChannel.name.toUpperCase()}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide"
      >
        {channelMessages.length === 0 ? (
          <div className="text-terminal-muted font-mono">
            No messages yet. Start the conversation!
          </div>
        ) : (
          channelMessages.map((msg) => (
            <div key={msg.id} className="font-mono mb-1">
              <span className="text-terminal-muted">{formatTimestamp(msg.timestamp)}</span>
              {" "}
              <span className={msg.status === "pending" ? "text-terminal-warning" : "text-terminal-info"}>
                {msg.username}
              </span>
              {": "}
              <span className="text-terminal-text">{msg.content}</span>
              {msg.status === "pending" && (
                <span className="text-terminal-warning ml-2">[Pending]</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <TerminalInput onSubmit={handleSendMessage} prompt=":" />
    </div>
  );
};

export default ChannelTerminal;

