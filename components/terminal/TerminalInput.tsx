"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TerminalInputProps {
  onSubmit: (input: string) => void;
  prompt?: string;
  disabled?: boolean;
  className?: string;
}

const TerminalInput = ({ onSubmit, prompt = ">", disabled = false, className }: TerminalInputProps) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(input);
        setHistory((prev) => [...prev, input]);
        setInput("");
        setHistoryIndex(-1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 border-t border-terminal-border", className)}>
      <span className="text-terminal-prompt terminal-glow font-bold">{prompt}</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="flex-1 bg-transparent text-terminal-text outline-none font-mono"
        placeholder={disabled ? "..." : "Type a command..."}
        autoComplete="off"
        spellCheck={false}
      />
      <span className="animate-blink">█</span>
    </div>
  );
};

export default TerminalInput;

