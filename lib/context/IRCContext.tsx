"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { IRCState, User, Channel, Message, SessionKey, TerminalLine } from "@/lib/types";

interface IRCContextType extends IRCState {
  setUser: (user: User | null) => void;
  setSessionKey: (key: SessionKey | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  addChannel: (channel: Channel) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setConnected: (connected: boolean) => void;
  setSessionAuthorized: (authorized: boolean) => void;
  setWalletMonitoring: (monitoring: boolean) => void;
  terminalLines: TerminalLine[];
  addTerminalLine: (content: string, type?: TerminalLine["type"]) => void;
  clearTerminal: () => void;
}

const IRCContext = createContext<IRCContextType | undefined>(undefined);

export const IRCProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setConnected] = useState(false);
  const [isSessionAuthorized, setSessionAuthorized] = useState(false);
  const [isWalletMonitoring, setWalletMonitoring] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: "banner-1",
      content: "=====================================================================================",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-2",
      content: "=  =====  ====    ====  =======  =====  =====       ========    ==       =====     ==",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-3",
      content: "=   ===   ===  ==  ===   ======  ====    ====  ====  ========  ===  ====  ===  ===  =",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-4",
      content: "=  =   =  ==  ====  ==    =====  ===  ==  ===  ====  ========  ===  ====  ==  =======",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-5",
      content: "=  == ==  ==  ====  ==  ==  ===  ==  ====  ==  ====  ========  ===  ===   ==  =======",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-6",
      content: "=  =====  ==  ====  ==  ===  ==  ==  ====  ==  ====  ========  ===      ====  =======",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-7",
      content: "=  =====  ==  ====  ==  ====  =  ==        ==  ====  ========  ===  ====  ==  =======",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-8",
      content: "=  =====  ==  ====  ==  =====    ==  ====  ==  ====  ========  ===  ====  ==  =======",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-9",
      content: "=  =====  ===  ==  ===  ======   ==  ====  ==  ====  ========  ===  ====  ===  ===  =",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-10",
      content: "=  =====  ====    ====  =======  ==  ====  ==       ========    ==  ====  ====     ==",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-11",
      content: "=====================================================================================",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "welcome-1",
      content: "",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-2",
      content: "Welcome to Monad IRC — decentralized on-chain chat via MetaMask Smart Accounts.",
      type: "info",
      timestamp: new Date(),
    },
    {
      id: "welcome-3",
      content: "",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-4",
      content: "Type one of the following to get started:",
      type: "info",
      timestamp: new Date(),
    },
    {
      id: "welcome-5",
      content: "- connect wallet       → connect your MetaMask Smart Account",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-6",
      content: "- authorize session    → authorize session key for message signing",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-7",
      content: "- join #general        → join the default channel",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-8",
      content: "- help or man          → view all available commands",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-9",
      content: "",
      type: "output",
      timestamp: new Date(),
    },
  ]);

  const addChannel = useCallback((channel: Channel) => {
    setChannels((prev) => {
      const exists = prev.find((c) => c.id === channel.id);
      if (exists) return prev;
      return [...prev, channel];
    });
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const addTerminalLine = useCallback((content: string, type: TerminalLine["type"] = "output") => {
    const newLine: TerminalLine = {
      id: `line-${Date.now()}-${Math.random()}`,
      content,
      type,
      timestamp: new Date(),
    };
    setTerminalLines((prev) => [...prev, newLine]);
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalLines([]);
  }, []);

  const value: IRCContextType = {
    user,
    sessionKey,
    currentChannel,
    channels,
    messages,
    isConnected,
    isSessionAuthorized,
    isWalletMonitoring,
    setUser,
    setSessionKey,
    setCurrentChannel,
    addChannel,
    addMessage,
    updateMessage,
    setConnected,
    setSessionAuthorized,
    setWalletMonitoring,
    terminalLines,
    addTerminalLine,
    clearTerminal,
  };

  return <IRCContext.Provider value={value}>{children}</IRCContext.Provider>;
};

export const useIRC = () => {
  const context = useContext(IRCContext);
  if (context === undefined) {
    throw new Error("useIRC must be used within an IRCProvider");
  }
  return context;
};

