"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { IRCState, User, Channel, Message, TerminalLine } from "@/lib/types";

interface IRCContextType extends IRCState {
  setUser: (user: User | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  addChannel: (channel: Channel) => void;
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setConnected: (connected: boolean) => void;
  setWalletMonitoring: (monitoring: boolean) => void;
  terminalLines: TerminalLine[];
  addTerminalLine: (content: string, type?: TerminalLine["type"]) => void;
  clearTerminal: () => void;
}

const IRCContext = createContext<IRCContextType | undefined>(undefined);

export const IRCProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setConnected] = useState(false);
  const [isWalletMonitoring, setWalletMonitoring] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: "banner-1",
      content: "                                                                                                                                                                                        ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-2",
      content: "                                                                                                                                                                                        ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-3",
      content: "MMMMMMMM               MMMMMMMM     OOOOOOOOO     NNNNNNNN        NNNNNNNN               AAA               DDDDDDDDDDDDD             IIIIIIIIIIRRRRRRRRRRRRRRRRR           CCCCCCCCCCCCC",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-4",
      content: "M:::::::M             M:::::::M   OO:::::::::OO   N:::::::N       N::::::N              A:::A              D::::::::::::DDD          I::::::::IR::::::::::::::::R       CCC::::::::::::C",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-5",
      content: "M::::::::M           M::::::::M OO:::::::::::::OO N::::::::N      N::::::N             A:::::A             D:::::::::::::::DD        I::::::::IR::::::RRRRRR:::::R    CC:::::::::::::::C",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-6",
      content: "M:::::::::M         M:::::::::MO:::::::OOO:::::::ON:::::::::N     N::::::N            A:::::::A            DDD:::::DDDDD:::::D       II::::::IIRR:::::R     R:::::R  C:::::CCCCCCCC::::C",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-7",
      content: "M::::::::::M       M::::::::::MO::::::O   O::::::ON::::::::::N    N::::::N           A:::::::::A             D:::::D    D:::::D        I::::I    R::::R     R:::::R C:::::C       CCCCCC",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-8",
      content: "M:::::::::::M     M:::::::::::MO:::::O     O:::::ON:::::::::::N   N::::::N          A:::::A:::::A            D:::::D     D:::::D       I::::I    R::::R     R:::::RC:::::C              ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-9",
      content: "M:::::::M::::M   M::::M:::::::MO:::::O     O:::::ON:::::::N::::N  N::::::N         A:::::A A:::::A           D:::::D     D:::::D       I::::I    R::::RRRRRR:::::R C:::::C              ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-10",
      content: "M::::::M M::::M M::::M M::::::MO:::::O     O:::::ON::::::N N::::N N::::::N        A:::::A   A:::::A          D:::::D     D:::::D       I::::I    R:::::::::::::RR  C:::::C              ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-11",
      content: "M::::::M  M::::M::::M  M::::::MO:::::O     O:::::ON::::::N  N::::N:::::::N       A:::::A     A:::::A         D:::::D     D:::::D       I::::I    R::::RRRRRR:::::R C:::::C              ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-12",
      content: "M::::::M   M:::::::M   M::::::MO:::::O     O:::::ON::::::N   N:::::::::::N      A:::::AAAAAAAAA:::::A        D:::::D     D:::::D       I::::I    R::::R     R:::::RC:::::C              ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-13",
      content: "M::::::M    M:::::M    M::::::MO:::::O     O:::::ON::::::N    N::::::::::N     A:::::::::::::::::::::A       D:::::D     D:::::D       I::::I    R::::R     R:::::RC:::::C              ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-14",
      content: "M::::::M     MMMMM     M::::::MO::::::O   O::::::ON::::::N     N:::::::::N    A:::::AAAAAAAAAAAAA:::::A      D:::::D    D:::::D        I::::I    R::::R     R:::::R C:::::C       CCCCCC",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-15",
      content: "M::::::M               M::::::MO:::::::OOO:::::::ON::::::N      N::::::::N   A:::::A             A:::::A   DDD:::::DDDDD:::::D       II::::::IIRR:::::R     R:::::R  C:::::CCCCCCCC::::C",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-16",
      content: "M::::::M               M::::::M OO:::::::::::::OO N::::::N       N:::::::N  A:::::A               A:::::A  D:::::::::::::::DD        I::::::::IR::::::R     R:::::R   CC:::::::::::::::C",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-17",
      content: "M::::::M               M::::::M   OO:::::::::OO   N::::::N        N::::::N A:::::A                 A:::::A D::::::::::::DDD          I::::::::IR::::::R     R:::::R     CCC::::::::::::C",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-18",
      content: "MMMMMMMM               MMMMMMMM     OOOOOOOOO     NNNNNNNN         NNNNNNNAAAAAAA                   AAAAAAADDDDDDDDDDDDD             IIIIIIIIIIRRRRRRRR     RRRRRRR        CCCCCCCCCCCCC",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-19",
      content: "                                                                                                                                                                                        ",
      type: "system",
      timestamp: new Date(),
    },
    {
      id: "banner-20",
      content: "                                                                                                                                                                                        ",
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
      content: "- join #general        → join the default channel",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-7",
      content: "- help or man          → view all available commands",
      type: "output",
      timestamp: new Date(),
    },
    {
      id: "welcome-8",
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
    setMessages((prev) => {
      // Check if message already exists by id
      const exists = prev.find((m) => m.id === message.id);
      if (exists) {
        // Update existing message instead of adding duplicate
        return prev.map((m) => m.id === message.id ? message : m);
      }
      return [...prev, message];
    });
  }, []);

  const addMessages = useCallback((newMessages: Message[]) => {
    setMessages((prev) => {
      const messageMap = new Map(prev.map((m) => [m.id, m]));
      
      // Add or update messages
      newMessages.forEach((msg) => {
        messageMap.set(msg.id, msg);
      });
      
      return Array.from(messageMap.values());
    });
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
    currentChannel,
    channels,
    messages,
    isConnected,
    isWalletMonitoring,
    setUser,
    setCurrentChannel,
    addChannel,
    addMessage,
    addMessages,
    updateMessage,
    setConnected,
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

