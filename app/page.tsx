"use client";

import { IRCProvider } from "@/lib/context/IRCContext";
import TerminalLayout from "@/components/terminal/TerminalLayout";
import StatusBar from "@/components/ui/StatusBar";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export default function Home() {
  return (
    <ConvexProvider client={convex}>
      <IRCProvider>
        <main className="h-screen w-screen overflow-hidden pb-6">
          <TerminalLayout />
          <StatusBar />
        </main>
      </IRCProvider>
    </ConvexProvider>
  );
}
