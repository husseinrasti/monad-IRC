import { ethers } from "ethers";

/**
 * Verify a signature matches a wallet address
 */
export const verifySignature = async (
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
};

/**
 * Create a verification message for wallet ownership
 */
export const createVerificationMessage = (walletAddress: string): string => {
  return `Verify wallet ownership for Monad IRC\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
};

/**
 * Parse wallet address to short format (0x1234...5678)
 */
export const formatWalletAddress = (address: string, chars: number = 4): string => {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Check if a string is a valid Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Check if wallet is connected
 */
export const isWalletConnected = async (): Promise<boolean> => {
  if (!window.ethereum) return false;
  
  try {
    const accounts = await window.ethereum.request({ 
      method: "eth_accounts" 
    }) as string[];
    return accounts.length > 0;
  } catch {
    return false;
  }
};

/**
 * Get current connected wallet address
 */
export const getCurrentWalletAddress = async (): Promise<string | null> => {
  if (!window.ethereum) return null;
  
  try {
    const accounts = await window.ethereum.request({ 
      method: "eth_accounts" 
    }) as string[];
    return accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
};

/**
 * Get current network/chain ID
 */
export const getCurrentChainId = async (): Promise<number | null> => {
  if (!window.ethereum) return null;
  
  try {
    const chainId = await window.ethereum.request({ 
      method: "eth_chainId" 
    }) as string;
    return parseInt(chainId, 16);
  } catch {
    return null;
  }
};

/**
 * Check if current network is Monad Testnet
 */
export const isMonadTestnet = async (): Promise<boolean> => {
  const chainId = await getCurrentChainId();
  // Monad Testnet chain ID - update this with actual chain ID when known
  const MONAD_TESTNET_CHAIN_ID = 10143; // Example, verify actual chain ID
  return chainId === MONAD_TESTNET_CHAIN_ID;
};

/**
 * Switch to Monad Testnet
 */
export const switchToMonadTestnet = async (): Promise<boolean> => {
  if (!window.ethereum) return false;
  
  try {
    const MONAD_TESTNET_CHAIN_ID = "0x279f"; // 10143 in hex
    
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_TESTNET_CHAIN_ID }],
    });
    
    return true;
  } catch (error: unknown) {
    // Chain not added to MetaMask, try to add it
    if ((error as { code?: number }).code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x279f", // 10143 in hex
            chainName: "Monad Testnet",
            nativeCurrency: {
              name: "MON",
              symbol: "MON",
              decimals: 18,
            },
            rpcUrls: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || ""],
            blockExplorerUrls: ["https://explorer.monad.xyz"],
          }],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Monad Testnet:", addError);
        return false;
      }
    }
    console.error("Failed to switch network:", error);
    return false;
  }
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

