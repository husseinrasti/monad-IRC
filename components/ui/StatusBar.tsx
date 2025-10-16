"use client";

import { useIRC } from "@/lib/context/IRCContext";
import { truncateAddress } from "@/lib/utils";

const StatusBar = () => {
  const { user, isConnected, isSessionAuthorized, currentChannel } = useIRC();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-terminal-bg border-t border-terminal-border px-4 py-1 text-xs text-terminal-text font-mono flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-terminal-info">Monad IRC v0.1.0</span>
        {isConnected && user && (
          <>
            <span className="text-terminal-muted">|</span>
            <span className="text-terminal-text">
              Connected: {truncateAddress(user.walletAddress)}
            </span>
          </>
        )}
        {currentChannel && (
          <>
            <span className="text-terminal-muted">|</span>
            <span className="text-terminal-warning">
              Channel: {currentChannel.name}
            </span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
        
        {isConnected && (
          <>
            <span className="text-terminal-muted">|</span>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isSessionAuthorized ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              <span>{isSessionAuthorized ? "Session Active" : "No Session"}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusBar;

