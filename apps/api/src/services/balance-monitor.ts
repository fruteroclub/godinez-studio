/**
 * Balance monitor for the master wallet.
 * Checks MON balance and logs warnings when below threshold.
 * Called before each deploy — no external scheduler needed.
 */
import { logger } from "../lib/logger";

/** Minimal provider interface matching viem's publicClient.getBalance */
interface BalanceProvider {
  getBalance(args: { address: string }): Promise<bigint>;
}

/** 0.5 MON in wei (18 decimals) */
const THRESHOLD_WEI = BigInt("500000000000000000");

interface BalanceCheckResult {
  ok: boolean;
  balanceMON: string;
  belowThreshold: boolean;
}

/**
 * Check the MON balance of a wallet address.
 * Logs a warning if balance is below 0.5 MON.
 */
export async function checkBalance(
  walletAddress: string,
  provider: BalanceProvider,
): Promise<BalanceCheckResult> {
  const balanceWei = await provider.getBalance({
    address: walletAddress,
  });

  // Convert wei to MON (18 decimals) with 6 decimal places of precision
  const wholePart = balanceWei / BigInt(10 ** 18);
  const fractionalWei = balanceWei % BigInt(10 ** 18);
  const fractionalPart = fractionalWei * BigInt(10 ** 6) / BigInt(10 ** 18);
  const balanceMON = `${wholePart}.${fractionalPart.toString().padStart(6, "0")}`;

  const belowThreshold = balanceWei < THRESHOLD_WEI;

  if (belowThreshold) {
    logger.warn(
      { wallet: walletAddress, balanceMON, thresholdMON: "0.5" },
      "Master wallet balance below threshold",
    );
  }

  return {
    ok: !belowThreshold,
    balanceMON,
    belowThreshold,
  };
}
