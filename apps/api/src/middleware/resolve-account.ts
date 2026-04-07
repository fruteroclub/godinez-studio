import { createMiddleware } from "hono/factory";
import { getAccountByUserId, createAccount } from "../dal/accounts";
import type { AuthEnv } from "../types";

export const resolveAccount = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.get("userId");

  let account = await getAccountByUserId(userId);

  if (!account) {
    account = await createAccount(userId);
  }

  if (!account) {
    return c.json({ error: "Failed to resolve account" }, 500);
  }

  c.set("account", account);
  await next();
});
