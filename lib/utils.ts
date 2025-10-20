import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const formatTimestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `[${year}-${month}-${day} ${hours}:${minutes}]`;
};

export const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Shorten a wallet address for display
 * @param address - Full wallet address (e.g., "0x1234567890abcdef")
 * @returns Shortened address (e.g., "0x1234...89fA")
 */
export const shortenAddress = (address: string): string => {
  return truncateAddress(address);
};

/**
 * Check if a string is a valid Ethereum address
 * @param value - String to check
 * @returns True if the string is a valid address format
 */
export const isAddress = (value: string): boolean => {
  if (!value) return false;
  // Check if it starts with 0x and has 42 characters (0x + 40 hex chars)
  return /^0x[a-fA-F0-9]{40}$/.test(value);
};

/**
 * Display name helper: shortens if address, otherwise shows as-is
 * @param username - Username or wallet address
 * @returns Shortened address if it's an address, otherwise the username
 */
export const displayName = (username: string): string => {
  if (!username) return "Unknown";
  return isAddress(username) ? shortenAddress(username) : username;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

