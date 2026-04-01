import Stripe from "stripe";
import { logger } from "./logger";

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn("[stripe] STRIPE_SECRET_KEY not set — billing features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
