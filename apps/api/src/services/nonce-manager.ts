/**
 * NonceManager — manages Monad wallet nonces for the master wallet.
 * Uses a promise-based mutex lock per wallet address to prevent nonce collisions.
 * In-memory; resets on restart (fetches fresh nonce from chain on first use).
 */
import { logger } from "../lib/logger";

/** Minimal provider interface matching viem's publicClient.getTransactionCount */
interface NonceProvider {
  getTransactionCount(args: {
    address: string;
    blockTag: "pending";
  }): Promise<number>;
}

interface WalletState {
  currentNonce: number;
  /** Promise-based mutex — awaiting this means waiting for the lock */
  lock: Promise<void> | null;
  /** Resolve function to release the current lock */
  releaseFn: (() => void) | null;
}

const wallets = new Map<string, WalletState>();

function getOrCreateState(address: string): WalletState {
  const normalized = address.toLowerCase();
  let state = wallets.get(normalized);
  if (!state) {
    state = { currentNonce: -1, lock: null, releaseFn: null };
    wallets.set(normalized, state);
  }
  return state;
}

/**
 * Acquire the mutex lock for a wallet address.
 * If another caller holds the lock, this will wait until it's released.
 */
async function acquireLock(state: WalletState): Promise<void> {
  // Wait for any existing lock to be released
  while (state.lock) {
    await state.lock;
  }

  // Create a new lock
  let resolve: () => void;
  state.lock = new Promise<void>((r) => {
    resolve = r;
  });
  state.releaseFn = () => {
    state.lock = null;
    state.releaseFn = null;
    resolve!();
  };
}

export const NonceManager = {
  /**
   * Get the next nonce for a wallet address.
   * Acquires a mutex lock, fetches from chain if needed, and increments.
   * The caller MUST call confirmTx() or releaseLock() after use.
   */
  async getNextNonce(
    walletAddress: string,
    provider: NonceProvider,
  ): Promise<number> {
    const state = getOrCreateState(walletAddress);
    await acquireLock(state);

    try {
      // If first use or after a release, fetch from chain
      if (state.currentNonce < 0) {
        state.currentNonce = await provider.getTransactionCount({
          address: walletAddress.toLowerCase(),
          blockTag: "pending",
        });
        logger.info(
          { wallet: walletAddress, nonce: state.currentNonce },
          "Fetched nonce from chain",
        );
      }

      const nonce = state.currentNonce;
      state.currentNonce++;
      return nonce;
    } catch (err) {
      // On failure, release the lock so others aren't stuck
      state.releaseFn?.();
      throw err;
    }
  },

  /**
   * Confirm a transaction was submitted successfully.
   * Releases the lock so the next caller can proceed.
   */
  confirmTx(walletAddress: string): void {
    const normalized = walletAddress.toLowerCase();
    const state = wallets.get(normalized);
    if (state?.releaseFn) {
      state.releaseFn();
    }
  },

  /**
   * Release the lock without confirming — used on transaction failure.
   * Resets nonce to -1 so the next call fetches fresh from chain.
   */
  releaseLock(walletAddress: string): void {
    const normalized = walletAddress.toLowerCase();
    const state = wallets.get(normalized);
    if (state) {
      state.currentNonce = -1; // Force re-fetch on next use
      state.releaseFn?.();
    }
  },
};
