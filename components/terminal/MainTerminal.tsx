"use client";

import { useEffect, useRef } from "react";
import { useIRC } from "@/lib/context/IRCContext";
import { useCommandHandler } from "@/lib/hooks/useCommandHandler";
import TerminalInput from "./TerminalInput";
import { cn } from "@/lib/utils";

const MainTerminal = () => {
  const { terminalLines } = useIRC();
  const { handleCommand } = useCommandHandler();
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const getLineColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-terminal-error";
      case "warning":
        return "text-terminal-warning";
      case "info":
        return "text-terminal-info";
      case "system":
        return "text-terminal-text terminal-glow";
      default:
        return "text-terminal-text";
    }
  };

  return (
    <div className="flex flex-col h-full bg-terminal-bg border-2 border-terminal-border crt-effect relative">
      <div className="scanline" />
      
      {/* Header */}
      <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/80 flex-shrink-0">
        <h2 className="text-terminal-text terminal-glow font-bold">
          MONAD IRC — MAIN TERMINAL
        </h2>
      </div>

      {/* Output - scrollable area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide min-h-0"
      >
        {terminalLines.map((line) => {
          const isBanner = line.id.startsWith("banner-");
          
          // Group banner lines together with accessibility
          if (isBanner && line.id === "banner-1") {
            const bannerLines = terminalLines.filter(l => l.id.startsWith("banner-"));
            return (
              <div
                key="banner-group"
                role="img"
                aria-label="Monad IRC ASCII banner"
                className="overflow-x-auto mb-2"
                style={{ fontSize: '0.35rem', lineHeight: '0.5rem' }}
              >
                {bannerLines.map((bannerLine) => (
                  <div
                    key={bannerLine.id}
                    className={cn(
                      "font-mono whitespace-pre",
                      getLineColor(bannerLine.type)
                    )}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace' }}
                  >
                    {bannerLine.content}
                  </div>
                ))}
              </div>
            );
          }
          
          // Skip other banner lines as they're rendered in the group
          if (isBanner) {
            return null;
          }
          
          // Render non-banner lines normally
          return (
            <div key={line.id} className={cn("font-mono whitespace-pre-wrap", getLineColor(line.type))}>
              {line.content}
            </div>
          );
        })}
      </div>

      {/* Input - always visible at bottom */}
      <div className="flex-shrink-0">
        <TerminalInput onSubmit={handleCommand} prompt=">" />
      </div>
    </div>
  );
};

export default MainTerminal;

