/**
 * Bundler Helper Utilities
 * Provides retry logic and error handling for bundler operations
 */

import { type Hash } from "viem";
import { type BundlerClient } from "viem/account-abstraction";
import { type MetaMaskSmartAccount } from "@metamask/delegation-toolkit";

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay for exponential backoff
 */
const calculateDelay = (
  attempt: number, 
  config: Required<RetryConfig>
): number => {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  errorLog?: (message: string) => void
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorLog) {
        errorLog(`Attempt ${attempt + 1}/${fullConfig.maxAttempts} failed: ${errorMessage}`);
      }

      // Don't retry on certain errors
      if (
        errorMessage.includes("User denied") ||
        errorMessage.includes("User rejected") ||
        errorMessage.includes("insufficient funds") ||
        errorMessage.includes("AA21")
      ) {
        throw error; // These errors won't be fixed by retrying
      }

      // If this was the last attempt, throw the error
      if (attempt === fullConfig.maxAttempts - 1) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const delay = calculateDelay(attempt, fullConfig);
      if (errorLog) {
        errorLog(`Retrying in ${delay}ms...`);
      }
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Send a user operation with retry logic
 */
export async function sendUserOperationWithRetry(
  bundlerClient: BundlerClient,
  smartAccount: MetaMaskSmartAccount,
  calls: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  }>,
  options: {
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    retryConfig?: RetryConfig;
    onLog?: (message: string) => void;
  } = {}
): Promise<Hash> {
  const {
    maxFeePerGas = BigInt(200000000000), // 200 Gwei default
    maxPriorityFeePerGas = BigInt(200000000000),
    retryConfig,
    onLog,
  } = options;

  return retryWithBackoff(
    async () => {
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      if (onLog) {
        onLog(`User operation submitted: ${userOpHash}`);
      }

      return userOpHash;
    },
    retryConfig,
    onLog
  );
}

/**
 * Wait for user operation receipt with retry logic
 */
export async function waitForUserOperationReceiptWithRetry(
  bundlerClient: BundlerClient,
  userOpHash: Hash,
  options: {
    timeout?: number;
    retryConfig?: RetryConfig;
    onLog?: (message: string) => void;
  } = {}
): Promise<{
  success: boolean;
  receipt: {
    transactionHash: Hash;
    blockNumber: bigint;
    gasUsed: bigint;
  };
}> {
  const {
    timeout = 60000, // 60 seconds default
    retryConfig,
    onLog,
  } = options;

  return retryWithBackoff(
    async () => {
      if (onLog) {
        onLog(`Waiting for user operation receipt...`);
      }

      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
        timeout,
      });

      if (!receipt) {
        throw new Error("Failed to get user operation receipt");
      }

      if (onLog) {
        onLog(`Receipt received: ${receipt.receipt.transactionHash}`);
      }

      return receipt;
    },
    retryConfig,
    onLog
  );
}

/**
 * Send user operation and wait for receipt with comprehensive error handling
 */
export async function executeUserOperation(
  bundlerClient: BundlerClient,
  smartAccount: MetaMaskSmartAccount,
  calls: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  }>,
  options: {
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    timeout?: number;
    retryConfig?: RetryConfig;
    onLog?: (message: string) => void;
  } = {}
): Promise<{
  success: boolean;
  transactionHash: Hash;
  userOpHash: Hash;
  error?: string;
}> {
  const { onLog, retryConfig, timeout, maxFeePerGas, maxPriorityFeePerGas } = options;

  try {
    // Step 1: Send user operation
    if (onLog) {
      onLog("Submitting user operation to bundler...");
    }

    const userOpHash = await sendUserOperationWithRetry(
      bundlerClient,
      smartAccount,
      calls,
      {
        maxFeePerGas,
        maxPriorityFeePerGas,
        retryConfig,
        onLog,
      }
    );

    // Step 2: Wait for receipt
    if (onLog) {
      onLog("User operation submitted. Waiting for confirmation...");
    }

    const receipt = await waitForUserOperationReceiptWithRetry(
      bundlerClient,
      userOpHash,
      {
        timeout,
        retryConfig,
        onLog,
      }
    );

    if (!receipt.success) {
      return {
        success: false,
        transactionHash: receipt.receipt.transactionHash,
        userOpHash,
        error: "Transaction reverted on-chain",
      };
    }

    if (onLog) {
      onLog(`✅ Transaction confirmed: ${receipt.receipt.transactionHash}`);
    }

    return {
      success: true,
      transactionHash: receipt.receipt.transactionHash,
      userOpHash,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (onLog) {
      onLog(`❌ User operation failed: ${errorMessage}`);
    }

    throw error;
  }
}

/**
 * Enhanced error message formatting for bundler errors
 */
export function formatBundlerError(error: unknown): {
  message: string;
  suggestions: string[];
  isRetryable: boolean;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const suggestions: string[] = [];
  let isRetryable = true;

  // Insufficient funds
  if (
    errorMessage.includes("insufficient funds") ||
    errorMessage.includes("AA21") ||
    errorMessage.includes("didn't pay prefund") ||
    errorMessage.includes("does not have sufficient funds")
  ) {
    suggestions.push("Fund your Smart Account with MON tokens");
    suggestions.push("Run command: fund <amount>");
    suggestions.push("Or send MON from MetaMask to your Smart Account address");
    isRetryable = false;
  }

  // User rejection
  if (errorMessage.includes("User denied") || errorMessage.includes("User rejected")) {
    suggestions.push("Transaction was cancelled by user");
    suggestions.push("Please approve the transaction in MetaMask to proceed");
    isRetryable = false;
  }

  // Bundler not available
  if (errorMessage.includes("bundler") || errorMessage.includes("not available")) {
    suggestions.push("Check that NEXT_PUBLIC_BUNDLER_URL is correctly configured");
    suggestions.push("Verify bundler service supports Monad network");
    suggestions.push("Try using a different bundler endpoint");
    isRetryable = true;
  }

  // Network issues
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("ECONNREFUSED")
  ) {
    suggestions.push("Check your internet connection");
    suggestions.push("Verify RPC endpoint is accessible");
    suggestions.push("Try again in a moment");
    isRetryable = true;
  }

  // Gas estimation issues
  if (errorMessage.includes("gas") || errorMessage.includes("estimation")) {
    suggestions.push("Increase gas limits in transaction");
    suggestions.push("Ensure contract function is callable");
    suggestions.push("Check if Smart Account has enough balance");
    isRetryable = true;
  }

  return {
    message: errorMessage,
    suggestions,
    isRetryable,
  };
}

