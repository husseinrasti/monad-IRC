"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useCommandHandler } from "@/lib/hooks/useCommandHandler";
import TerminalInput from "./TerminalInput";
import { formatTimestamp, displayName } from "@/lib/utils";
import { Message } from "@/lib/types";

const ChannelTerminal = () => {
  const { currentChannel, messages, user } = useIRC();
  const { handleCommand, handleRegularMessage } = useCommandHandler();
  const outputRef = useRef<HTMLDivElement>(null);

  // Handler for channel input - distinguishes between commands and messages
  const handleChannelInput = useCallback((input: string) => {
    // If input starts with a command prefix, treat it as a command
    // Commands can start with: join, leave, help, man, clear, nick, etc.
    const commandPrefixes = ['join', 'leave', 'help', 'man', 'clear', 'nick', 'whoami', 'list', 'whois', 'exit', 'quit', 'disconnect', 'connect', 'balance', 'fund'];
    const firstWord = input.trim().split(' ')[0].toLowerCase();
    
    if (commandPrefixes.includes(firstWord)) {
      // Process as command
      handleCommand(input);
    } else {
      // Send as message to channel
      handleRegularMessage(input);
    }
  }, [handleCommand, handleRegularMessage]);

  /**
   * Filter and display messages with visibility rules:
   * - Pending messages: only visible to the sender
   * - Confirmed messages: visible to all
   * - Failed messages: visible to the sender
   */
  const visibleMessages = useMemo(() => {
    if (!currentChannel) return [];

    const channelMessages = messages.filter((msg) => msg.channelId === currentChannel.id);

    // Apply visibility rules
    return channelMessages.filter((msg) => {
      // Confirmed messages are visible to all
      if (msg.status === "confirmed") return true;

      // Pending/Failed messages are only visible to the sender
      if (msg.status === "pending" || msg.status === "failed") {
        return msg.senderWallet === user?.smartAccountAddress;
      }

      return false;
    });
  }, [messages, currentChannel, user?.smartAccountAddress]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  if (!currentChannel) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-terminal-bg border-2 border-terminal-border crt-effect relative">
      <div className="scanline" />
      
      {/* Header */}
      <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/80 flex-shrink-0">
        <h2 className="text-terminal-text terminal-glow font-bold">
          {currentChannel.name.toUpperCase()}
        </h2>
        <div className="text-terminal-muted text-xs mt-1">
          {visibleMessages.length} {visibleMessages.length === 1 ? "message" : "messages"}
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide min-h-0"
      >
        {visibleMessages.length === 0 ? (
          <div className="text-terminal-muted font-mono">
            No messages yet. Start the conversation!
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isPending = msg.status === "pending";
            const isFailed = msg.status === "failed";
            const isOwnMessage = msg.senderWallet === user?.smartAccountAddress;

            return (
              <div 
                key={msg.id} 
                className={`font-mono mb-1 ${isPending ? "opacity-60" : ""} ${isFailed ? "opacity-40" : ""}`}
              >
                {/* Timestamp */}
                <span className="text-terminal-muted text-xs">
                  {formatTimestamp(msg.timestamp)}
                </span>
                {" "}
                
                {/* Username/Address */}
                <span 
                  className={`font-bold ${
                    isFailed 
                      ? "text-red-500" 
                      : isPending 
                      ? "text-terminal-warning" 
                      : isOwnMessage 
                      ? "text-terminal-info" 
                      : "text-green-400"
                  }`}
                >
                  {displayName(msg.username)}
                </span>
                {": "}
                
                {/* Message content */}
                <span className="text-terminal-text">{msg.content}</span>
                
                {/* Status indicators */}
                {isPending && (
                  <span className="text-terminal-warning ml-2 text-xs">
                    [⏳ Pending]
                  </span>
                )}
                {isFailed && (
                  <span className="text-red-500 ml-2 text-xs">
                    [❌ Failed]
                  </span>
                )}
                
                {/* Transaction hash for confirmed messages */}
                {msg.txHash && msg.status === "confirmed" && (
                  <span className="text-terminal-muted ml-2 text-xs">
                    [Tx: {msg.txHash.slice(0, 10)}...]
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input - always visible at bottom */}
      <div className="flex-shrink-0">
        <TerminalInput 
          onSubmit={handleChannelInput} 
          prompt={`${currentChannel.name} >`}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
};

export default ChannelTerminal;

