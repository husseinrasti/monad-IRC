"use client";

import { useIRC } from "@/lib/context/IRCContext";
import MainTerminal from "./MainTerminal";
import ChannelTerminal from "./ChannelTerminal";
import { cn } from "@/lib/utils";

const TerminalLayout = () => {
  const { currentChannel } = useIRC();

  return (
    <div className="h-screen w-screen bg-terminal-bg p-4 overflow-hidden">
      <div className={cn(
        "h-full grid gap-4",
        currentChannel ? "grid-cols-2" : "grid-cols-1"
      )}>
        {/* Main Terminal - always visible */}
        <div className="h-full min-h-0 overflow-hidden">
          <MainTerminal />
        </div>

        {/* Channel Terminal - shown when in a channel */}
        {currentChannel && (
          <div className="h-full min-h-0 overflow-hidden">
            <ChannelTerminal />
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalLayout;

