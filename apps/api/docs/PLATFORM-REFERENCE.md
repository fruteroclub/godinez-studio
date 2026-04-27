# Stripe Billing Integration — Godínez.AI Studio

_Spec v3.0 — 2026-03-26 | Based on PLATFORM-REFERENCE.md_

---

## Architecture

```
dev.godinez.ai
  → CTA link → studio.godinez.ai/billing/checkout (public page)

studio.godinez.ai/billing/checkout
  → POST /api/billing/checkout (public endpoint, no auth)
  → receives { url } → redirect to Stripe Checkout

Stripe Checkout (hosted by Stripe)
  → user enters email + card
  → payment confirmed
  → redirect to studio.godinez.ai/billing/success

POST /api/billing/webhook (public, Stripe signature auth)
  checkout.session.completed:
    1. clerkClient.users.createUser({ email })   → clerkId
    2. upsertUser({ clerkId, email })             → dbUser
    3. createAccount(dbUser.id, customerId)        → account (status: "active")
    4. Clerk sends welcome/magic-link email automatically
  invoice.payment_failed  → updateAccountSubscription(customerId, "past_due")
  subscription.deleted    → updateAccountSubscription(customerId, "cancelled")
  subscription.updated    → sync status

studio.godinez.ai (returning user)
  → logs in via Clerk magic link / normal auth
  → onboarding wizard at /studio/new (unchanged — handles provisioning)
  → POST /api/chat/send → blocked with 402 if subscription_status != "active"
  → GET /api/billing/portal → Stripe-hosted subscription management page
```

---

## 1. New DB Table: `accounts`

**File:** `packages/db/src/schema/accounts.ts`

```ts
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  subscriptionId: text("subscription_id").unique(),
  subscriptionStatus: text("subscription_status").notNull().default("free"),
  // "free" | "active" | "past_due" | "cancelled"
  subscriptionTier: text("subscription_tier"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

Export in `packages/db/src/schema/index.ts`:

```ts
export { accounts } from "./accounts";
```

Run: `pnpm --filter @godinez/api db:generate` → `db:migrate`

---

## 2. Environment Variables

Add to `apps/api/.env.example`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_BILLING_WEBHOOK_SECRET=whsec_...
STRIPE_AGENTCAMP_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
STRIPE_SUCCESS_URL=https://studio.godinez.ai/billing/success
STRIPE_CANCEL_URL=https://studio.godinez.ai/billing/cancel
AGENTCAMP_COHORT=agentcamp_2026_q2
AGENTCAMP_EARLY_BIRD_PRICE_ID=price_...
AGENTCAMP_REGULAR_PRICE_ID=price_...
AGENTCAMP_EARLY_BIRD_CUTOFF_ISO=2026-05-15T23:59:59.000Z
AGENTCAMP_MAX_CAPACITY=50
AGENTCAMP_SALES_ENABLED=true
```

Update `CORS_ORIGIN` in Railway `@godinez/api` production:

```
CORS_ORIGIN=https://studio.godinez.ai,https://godinez.ai,https://dev.godinez.ai
```

For local AgentCamp landing integration, include:

```
CORS_ORIGIN=http://localhost:8080
```

---

## 3. Backend

### 3.1 Install Stripe SDK

```bash
pnpm --filter @godinez/api add stripe
```

(`@clerk/backend` is already installed as a dependency.)

### 3.2 `apps/api/src/lib/stripe.ts`

```ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY)
  throw new Error("STRIPE_SECRET_KEY required");

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});
```

### 3.3 `apps/api/src/dal/accounts.ts`

```ts
import { eq } from "drizzle-orm";
import { db } from "../db";
import { accounts } from "@godinez/db";

export async function getAccountByUserId(userId: number) {
  return db.query.accounts.findFirst({ where: eq(accounts.ownerId, userId) });
}

export async function getAccountByStripeCustomerId(customerId: string) {
  return db.query.accounts.findFirst({
    where: eq(accounts.stripeCustomerId, customerId),
  });
}

export async function createAccount(
  ownerId: number,
  stripeCustomerId?: string,
) {
  const [account] = await db
    .insert(accounts)
    .values({ ownerId, stripeCustomerId })
    .returning();
  return account;
}

export async function updateAccountSubscription(
  stripeCustomerId: string,
  data: {
    subscriptionId?: string;
    subscriptionStatus: string;
    subscriptionTier?: string;
    currentPeriodEnd?: Date;
  },
) {
  await db
    .update(accounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(accounts.stripeCustomerId, stripeCustomerId));
}
```

### 3.4 `apps/api/src/middleware/resolve-account.ts`

```ts
import { createMiddleware } from "hono/factory";
import { getAccountByUserId, createAccount } from "../dal/accounts";

export const resolveAccount = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  let account = await getAccountByUserId(user.id);
  if (!account) account = await createAccount(user.id);

  c.set("account", account);
  await next();
});
```

Add `account` to the `AppEnv` type in `apps/api/src/types.ts`.

### 3.5 `apps/api/src/routes/billing.ts`

```ts
import { Hono } from "hono";
import { createClerkClient } from "@clerk/backend";
import { stripe } from "../lib/stripe";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { resolveAccount } from "../middleware/resolve-account";
import { createAccount, updateAccountSubscription } from "../dal/accounts";
import { upsertUser } from "../dal/users";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const billing = new Hono();

// ─── PUBLIC: Create Checkout Session ────────────────────────────────────────
billing.post("/checkout", async (c) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    mode: "subscription",
    success_url: process.env.STRIPE_SUCCESS_URL!,
    cancel_url: process.env.STRIPE_CANCEL_URL!,
    customer_creation: "always",
    // Stripe collects email during checkout — no auth required
  });

  return c.json({ url: session.url });
});

// ─── AUTH REQUIRED: Customer Portal ─────────────────────────────────────────
billing.get("/portal", requireAuth, resolveUser, resolveAccount, async (c) => {
  const account = c.get("account");

  if (!account.stripeCustomerId) {
    return c.json({ error: "No active subscription" }, 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: "https://studio.godinez.ai",
  });

  return c.json({ url: session.url });
});

// ─── PUBLIC: Stripe Webhook ──────────────────────────────────────────────────
// ⚠️ Must receive raw body — do NOT add JSON parsing middleware before this route
billing.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "Missing signature" }, 400);

  let event: Stripe.Event;
  try {
    const body = await c.req.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email;
      const customerId = session.customer as string;
      if (!email) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      // 1. Create Clerk user (Clerk sends welcome email / magic link automatically)
      const clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        skipPasswordRequirement: true,
      });

      // 2. Upsert user in DB (reuses existing DAL function)
      const dbUser = await upsertUser({
        clerkId: clerkUser.id,
        email,
        name: session.customer_details?.name ?? undefined,
      });

      // 3. Create account with active subscription
      await createAccount(dbUser.id, customerId);
      await updateAccountSubscription(customerId, {
        subscriptionId: subscription.id,
        subscriptionStatus: "active",
        subscriptionTier: "godinez_personal",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });

      // User receives Clerk welcome email → magic link → /studio/new (onboarding wizard)
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await updateAccountSubscription(invoice.customer as string, {
        subscriptionStatus: "past_due",
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await updateAccountSubscription(sub.customer as string, {
        subscriptionStatus: "cancelled",
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await updateAccountSubscription(sub.customer as string, {
        subscriptionStatus: sub.status === "active" ? "active" : "past_due",
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
      break;
    }
  }

  return c.json({ received: true });
});

export { billing };
```

Register in `apps/api/src/index.ts`:

```ts
import { billing } from "./routes/billing";
app.route("/api/billing", billing);
```

### 3.6 Chat gate — `apps/api/src/routes/chat.ts`

Add `resolveAccount` to the `POST /api/chat/send` handler and block if not active:

```ts
import { resolveAccount } from "../middleware/resolve-account";

// In POST /send, after resolveUser:
billing.post(
  "/send",
  requireAuth,
  resolveUser,
  resolveAccount,
  requireQuota("tokens"),
  async (c) => {
    const account = c.get("account");
    if (account?.subscriptionStatus !== "active") {
      return c.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: "Suscripción vencida. Actualiza tu método de pago.",
        },
        402,
      );
    }
    // ... existing chat logic
  },
);
```

---

## 4. Frontend — `apps/web`

### 4.1 `/billing/checkout` — Public page (no auth)

**File:** `apps/web/src/pages/BillingCheckout.tsx`

```tsx
import { useEffect, useState } from "react";

export function BillingCheckout() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/billing/checkout`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then(({ url }) => {
        if (url) window.location.href = url;
        else setError("No se pudo iniciar el checkout.");
      })
      .catch(() => setError("Error al conectar. Intenta de nuevo."));
  }, []);

  if (error) return <p className="text-center p-8 text-destructive">{error}</p>;

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Preparando tu suscripción...</p>
    </div>
  );
}
```

Add route without `<ProtectedRoute>` in `apps/web/src/App.tsx`:

```tsx
<Route path="/billing/checkout" element={<BillingCheckout />} />
<Route path="/billing/success" element={<BillingSuccess />} />
<Route path="/billing/cancel" element={<BillingCancel />} />
```

### 4.2 `use-billing.ts` hook (for portal — authenticated users)

**File:** `apps/web/src/hooks/use-billing.ts`

```ts
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api"; // existing auth-aware client

export function useBillingPortal() {
  return useMutation({
    mutationFn: () =>
      api.get<{ url: string }>("/api/billing/portal").then((r) => r.data),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
```

### 4.3 `<SubscriptionGate />` component

Show when `POST /api/chat/send` returns 402:

```tsx
import { useBillingPortal } from "../hooks/use-billing";

export function SubscriptionGate() {
  const portal = useBillingPortal();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Suscripción vencida</h2>
      <p className="text-muted-foreground">
        Actualiza tu método de pago para continuar usando Godínez.AI
      </p>
      <button
        onClick={() => portal.mutate()}
        disabled={portal.isPending}
        className="btn-primary"
      >
        {portal.isPending ? "Cargando..." : "Actualizar pago"}
      </button>
    </div>
  );
}
```

### 4.4 Result pages

**`/billing/success`:**

> "¡Listo! Revisa tu email — te enviamos un enlace para acceder a tu cuenta."

**`/billing/cancel`:**

> "Pago cancelado. [Intentar de nuevo →]"

---

## 5. `godinez-ai` changes (branch: `dev`)

Simple link, no API calls, no Clerk:

```tsx
<a href="https://studio.godinez.ai/billing/checkout">{/* your CTA copy */}</a>
```

---

## 6. Stripe Dashboard setup (manual — Mel)

1. **Create product:** `Godínez Personal` — $150 USD recurring monthly
2. Copy `price_XXXXX` → env var `STRIPE_PRICE_ID`
3. **Register webhook:**
   - URL: `https://api.godinez.ai/api/billing/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
4. Copy the billing endpoint `whsec_XXXXX` → env var `STRIPE_BILLING_WEBHOOK_SECRET`
5. Copy sandbox secret key → env var `STRIPE_SECRET_KEY`

---

## 7. Implementation order

```
1.  DB: accounts table + migration
2.  DAL: dal/accounts.ts
3.  Middleware: middleware/resolve-account.ts + update types.ts
4.  Stripe lib: lib/stripe.ts + install SDK
5.  Routes: routes/billing.ts (register in index.ts)
6.  Chat gate: add resolveAccount + 402 block to POST /api/chat/send
7.  Frontend: BillingCheckout + BillingSuccess + BillingCancel pages
8.  Frontend: use-billing.ts hook + SubscriptionGate component
9.  godinez-ai (branch dev): CTA link
10. Stripe Dashboard: product + price + webhook
11. Railway: add STRIPE_* env vars + update CORS_ORIGIN
```

---

## 8. Test cards (sandbox)

| Card                  | Behavior                       |
| --------------------- | ------------------------------ |
| `4242 4242 4242 4242` | Payment success                |
| `4000 0000 0000 9995` | Payment failed (test past_due) |
| `4000 2500 0000 0003` | Requires 3D Secure             |

---

## Notes

- `/api/billing/webhook` and `/api/billing/checkout` are **public** — no `requireAuth`
- `/api/billing/portal` requires `requireAuth` + `resolveUser` + `resolveAccount`
- Webhook raw body: ensure Hono's JSON body parser does not run before `/api/billing/webhook`
- Branch: `feature/stripe-billing` — merge to dev/main after Monad Blitz hackathon
- Go live: swap `sk_test_` → `sk_live_` in Railway env vars, zero code changes
- Onboarding wizard (`/studio/new`) handles agent provisioning — **no changes needed there**
- Beta testers live only in `development` environment — production has no beta users, no exemption logic needed
