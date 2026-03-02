import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireServiceKey } from "../middleware/require-service-key";
import {
  createReferralCode,
  validateReferralCode,
  redeemReferralCode,
} from "../dal/referral-codes";

const app = new Hono<AuthEnv>();

// POST /api/referral-codes — generate code (service-to-service)
app.post(
  "/",
  requireServiceKey,
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      source: z.string().max(100).optional(),
    }),
  ),
  async (c) => {
    const { email, name, source } = c.req.valid("json");
    const code = await createReferralCode({ email, name, source });
    return c.json(code, 201);
  },
);

// POST /api/referral-codes/validate — check if code is valid (public)
app.post(
  "/validate",
  zValidator(
    "json",
    z.object({
      code: z.string().min(1),
    }),
  ),
  async (c) => {
    const { code } = c.req.valid("json");
    const record = await validateReferralCode(code);
    if (!record) {
      return c.json({ valid: false }, 200);
    }
    return c.json({ valid: true, email: record.email }, 200);
  },
);

// POST /api/referral-codes/redeem — burn code after signup (requires auth)
app.post(
  "/redeem",
  requireAuth,
  resolveUser,
  zValidator(
    "json",
    z.object({
      code: z.string().min(1),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { code } = c.req.valid("json");
    const redeemed = await redeemReferralCode(code, userId);
    if (!redeemed) {
      return c.json({ error: "Invalid or already used code" }, 400);
    }
    return c.json({ success: true });
  },
);

export default app;
