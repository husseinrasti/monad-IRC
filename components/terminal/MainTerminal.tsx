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
    <div className="flex flex-col h-full bg-terminal-bg border-2 border-terminal-border crt-effect">
      <div className="scanline" />
      
      {/* Header */}
      <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/80">
        <h2 className="text-terminal-text terminal-glow font-bold">
          MONAD IRC — MAIN TERMINAL
        </h2>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide"
      >
        {terminalLines.map((line) => (
          <div key={line.id} className={cn("font-mono whitespace-pre-wrap", getLineColor(line.type))}>
            {line.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <TerminalInput onSubmit={handleCommand} prompt=">" />
    </div>
  );
};

export default MainTerminal;

