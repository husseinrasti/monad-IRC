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

  // Auto-focus input when component mounts or disabled state changes
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Maintain focus when clicking anywhere in the input container
  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(input);
        setHistory((prev) => [...prev, input]);
        setInput("");
        setHistoryIndex(-1);
        // Refocus after submit
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
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
    <div 
      onClick={handleContainerClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 border-t border-terminal-border bg-terminal-bg cursor-text",
        className
      )}
    >
      <span className="text-terminal-prompt terminal-glow font-bold flex-shrink-0">{prompt}</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="flex-1 bg-transparent text-terminal-text outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={disabled ? "..." : "Type a command..."}
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />
      <span className="animate-blink flex-shrink-0">█</span>
    </div>
  );
};

export default TerminalInput;

