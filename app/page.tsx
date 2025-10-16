"use client";

import { IRCProvider } from "@/lib/context/IRCContext";
import TerminalLayout from "@/components/terminal/TerminalLayout";
import StatusBar from "@/components/ui/StatusBar";

export default function Home() {
  return (
    <IRCProvider>
      <main className="h-screen w-screen overflow-hidden pb-6">
        <TerminalLayout />
        <StatusBar />
      </main>
    </IRCProvider>
  );
}
