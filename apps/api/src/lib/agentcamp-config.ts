const DEFAULT_COHORT = "agentcamp_2026_q2";

function readRequired(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readBoolean(name: string) {
  return process.env[name] === "true";
}

function readInteger(name: string) {
  const rawValue = readRequired(name);
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }

  return parsed;
}

function readIsoDate(name: string) {
  const date = new Date(readRequired(name));
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`${name} must be a valid ISO date`);
  }

  return date;
}

export function getAgentcampConfig() {
  return {
    cohort: process.env.AGENTCAMP_COHORT || DEFAULT_COHORT,
    earlyBirdCutoff: readIsoDate("AGENTCAMP_EARLY_BIRD_CUTOFF_ISO"),
    earlyBirdPriceId: readRequired("AGENTCAMP_EARLY_BIRD_PRICE_ID"),
    maxCapacity: readInteger("AGENTCAMP_MAX_CAPACITY"),
    regularPriceId: readRequired("AGENTCAMP_REGULAR_PRICE_ID"),
    salesEnabled: readBoolean("AGENTCAMP_SALES_ENABLED"),
  };
}
