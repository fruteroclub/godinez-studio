import { eq, and, gt, desc } from "drizzle-orm";
import { referralCodes } from "@godinez/db";
import { db } from "../db";

const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const EXPIRY_DAYS = 30;

function generateCode(): string {
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  for (const byte of bytes) {
    code += CODE_CHARSET[byte % CODE_CHARSET.length];
  }
  return `BETA-${code}`;
}

export async function createReferralCode(data: {
  email: string;
  name?: string;
  source?: string;
}) {
  const code = generateCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

  const [created] = await db
    .insert(referralCodes)
    .values({
      code,
      email: data.email,
      name: data.name,
      source: data.source,
      expiresAt,
    })
    .returning();
  return created;
}

export async function listReferralCodes() {
  return db.query.referralCodes.findMany({
    orderBy: desc(referralCodes.createdAt),
    limit: 100,
  });
}

export async function validateReferralCode(code: string) {
  const record = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.code, code.toUpperCase()),
      eq(referralCodes.used, false),
      gt(referralCodes.expiresAt, new Date()),
    ),
  });
  return record ?? null;
}

export async function redeemReferralCode(code: string, userId: number) {
  const [updated] = await db
    .update(referralCodes)
    .set({
      used: true,
      usedAt: new Date(),
      redeemedByUserId: userId,
    })
    .where(
      and(
        eq(referralCodes.code, code.toUpperCase()),
        eq(referralCodes.used, false),
      ),
    )
    .returning();
  return updated ?? null;
}
