# AgentCamp Subscription Conversion — Implementation Plan

> Status: source of truth for the AgentCamp payment-to-subscription conversion flow.
>
> This document supersedes any conflicting AgentCamp assumptions in
> [docs/stripe-billing-implementation-plan.md](/Users/mel/code/poktalabs/docs/stripe-billing-implementation-plan.md).

## Goal

Implement the AgentCamp payment flow so that:

- the user pays only AgentCamp tuition at checkout:
  - `$5,000 MXN` early-bird, or
  - `$7,500 MXN` regular
- the same checkout also creates a `Godinez Personal` subscription in Stripe
- that subscription remains in `trialing` status until **July 11, 2026**
- the user gets Studio access during the AgentCamp access window
- on **July 11, 2026**, Stripe automatically attempts the first monthly `Godinez Personal` charge
- after that charge, the user continues as a normal paid Studio subscriber

This plan assumes:

- this is the **first-time setup**
- there are **no legacy paid users**
- there are **no pre-May-11 purchasers to migrate**

## Decision

Use one Stripe Checkout flow only:

- `mode: "subscription"`
- include two line items:
  - the one-time AgentCamp tuition price
  - the recurring `Godinez Personal` price
- set a fixed `trial_end` at **July 11, 2026 00:00 America/Mexico_City**

This is the implementation path.

There is no “schedule vs immediate subscription” branch in this plan.

## Why This Matches The Requirement

This model satisfies the business rule directly:

- tuition is charged now
- recurring subscription exists now
- recurring billing does **not** start now
- Studio access is available during the trial window
- recurring billing begins automatically on **July 11, 2026**

Because this is first-time setup only, we do **not** need:

- legacy payment-method recovery flows
- future-start subscription schedules
- account-level temporary access grants

## Existing Schema Fit

The current schema is already enough to support this flow:

### `accounts`

Existing fields already cover recurring billing state:

- `stripeCustomerId`
- `subscriptionId`
- `subscriptionStatus`
- `subscriptionTier`
- `currentPeriodEnd`

### `agentcamp_registrations`

Existing fields already cover tuition checkout tracking:

- `stripeSessionId`
- `stripeCustomerId`
- `stripePaymentIntentId`
- `status`
- `studioUserId`
- `studioAccountId`

## Database Changes

No new database columns are required for this implementation.

The only schema-related adjustment is semantic:

- `accounts.subscriptionStatus` must be treated as supporting:
  - `free`
  - `trialing`
  - `active`
  - `past_due`
  - `cancelled`

That means:

- update comments/types/helpers to include `trialing`
- no Drizzle migration is needed unless you want to formalize this with an enum later

## Stripe Model

### Checkout mode

Update AgentCamp tuition checkout to create a Stripe Checkout Session in `subscription` mode.

The session should include:

- `customer_creation: "always"`
- `mode: "subscription"`
- one tuition line item:
  - early-bird or regular AgentCamp price
- one recurring line item:
  - `Godinez Personal`
- `subscription_data.trial_end = July 11, 2026 00:00 America/Mexico_City`

### Resulting behavior

After successful checkout:

- the tuition line item is charged immediately
- the recurring subscription is created immediately
- the subscription is `trialing`
- Stripe stores the payment method for future recurring billing
- the first monthly recurring invoice is attempted on **July 11, 2026**

## Access Rule

Studio access should be granted when:

- `subscriptionStatus === "trialing"` or
- `subscriptionStatus === "active"`

Studio access should be denied when:

- `subscriptionStatus === "free"`
- `subscriptionStatus === "past_due"`
- `subscriptionStatus === "cancelled"`

This is the only access rule required for this implementation.

## Backend Changes

### A1. Extend AgentCamp config

**Edit:** `apps/api/src/lib/agentcamp-config.ts`

Add:

- `STRIPE_GODINEZ_PERSONAL_PRICE_ID`
- `AGENTCAMP_CONVERSION_AT_ISO`

Keep existing:

- `AGENTCAMP_EARLY_BIRD_CUTOFF_ISO`
- `AGENTCAMP_EARLY_BIRD_PRICE_ID`
- `AGENTCAMP_REGULAR_PRICE_ID`
- `AGENTCAMP_MAX_CAPACITY`
- `AGENTCAMP_COHORT`
- `AGENTCAMP_SALES_ENABLED`

Suggested production value:

- `AGENTCAMP_CONVERSION_AT_ISO=2026-07-11T00:00:00-06:00`

This timestamp should be the fixed `trial_end`.

### A2. Update AgentCamp checkout creation

**Edit:** `apps/api/src/services/agentcamp-checkout.ts`

Change the Checkout Session creation from:

- `mode: "payment"`

To:

- `mode: "subscription"`

Set:

- `customer_creation: "always"`
- `line_items`:
  - selected AgentCamp tuition price
  - `STRIPE_GODINEZ_PERSONAL_PRICE_ID`
- `subscription_data.trial_end`
- metadata:
  - `checkoutSource`
  - `cohort`
  - `locale`
  - `tier`

Keep:

- capacity check
- early-bird vs regular tuition selection
- pending registration creation

### A3. Update pending registration creation

**Edit:** `apps/api/src/dal/agentcamp-registrations.ts`

Keep the existing shape.

No schema change is required here.

The existing pending-registration record still represents:

- the AgentCamp tuition purchase attempt
- later reconciled by webhook

### A4. Update AgentCamp checkout reconciliation

**Edit:** `apps/api/src/services/agentcamp-reconcile.ts`

When `checkout.session.completed` arrives:

1. resolve or create Clerk user
2. upsert Studio user
3. create or resolve Studio account
4. mark AgentCamp registration as paid
5. attach the registration to the Studio account
6. retrieve the Stripe subscription from `session.subscription`
7. update the Studio account with:
   - `stripeCustomerId`
   - `subscriptionId`
   - `subscriptionStatus`
   - `subscriptionTier = "godinez_personal"`
   - `currentPeriodEnd`

Expected first state after checkout:

- `subscriptionStatus = "trialing"`

### A5. Expand billing webhook syncing

**Edit:** `apps/api/src/routes/billing.ts`

The billing webhook must treat `trialing` as a first-class recurring state.

Handle and sync:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

Behavior:

- on initial checkout completion:
  - account becomes `trialing`
- on subscription update:
  - sync `subscriptionStatus`
  - sync `currentPeriodEnd`
- on first successful post-trial invoice:
  - account becomes `active`
- on payment failure:
  - account becomes `past_due`
- on deletion:
  - account becomes `cancelled`

### A6. Centralize access logic

**New file:** `apps/api/src/lib/account-access.ts`

Add a shared helper:

- `hasStudioAccess(account)`

Behavior:

```ts
return (
  account.subscriptionStatus === "trialing" ||
  account.subscriptionStatus === "active"
);
```

This prevents repeated hardcoded checks across routes.

### A7. Update route gates

**Edit:** `apps/api/src/routes/chat.ts`

Replace:

- `account.subscriptionStatus !== "active"`

With:

- `!hasStudioAccess(account)`

**Edit:** `apps/api/src/routes/workspaces.ts`

Make the same change.

### A8. Update billing status route

**Edit:** `apps/api/src/routes/billing.ts`

In `GET /status`:

- treat `trialing` as a valid paid-access state
- return `hasActiveSubscription` as:
  - `true` for `trialing`
  - `true` for `active`
  - `false` otherwise

This keeps the existing frontend contract small and avoids unnecessary API shape changes.

### A9. Update account typing

**Edit:** `apps/api/src/types.ts`

No new fields are required.

Only ensure all internal typing/comments allow `trialing`.

### A10. Optional comment cleanup in schema

**Edit:** `packages/db/src/schema/accounts.ts`

Update the inline comment from:

- `"free" | "active" | "past_due" | "cancelled"`

To:

- `"free" | "trialing" | "active" | "past_due" | "cancelled"`

This is not a DB migration, only code clarity.

## Frontend Changes

### B1. Billing status hook

**Edit:** `apps/web/src/hooks/use-billing.ts`

No new fields are required if the API keeps `hasActiveSubscription`.

The important change is semantic:

- `hasActiveSubscription` now means:
  - `trialing` or `active`

### B2. Billing gate

**Edit:** `apps/web/src/components/billing/BillingGate.tsx`

No major structural change is required if it already relies on `hasActiveSubscription`.

After the backend change, AgentCamp students in `trialing` will be allowed through automatically.

### B3. AgentCamp purchase copy

Wherever the AgentCamp checkout CTA is rendered, add explicit copy that states:

- the user pays AgentCamp tuition now
- their `Godinez Personal` subscription starts billing on **July 11, 2026**
- billing will recur monthly after that date unless cancelled

This should be visible before the Stripe redirect.

## Environment Changes

Add to API env config:

- `STRIPE_GODINEZ_PERSONAL_PRICE_ID`
- `AGENTCAMP_CONVERSION_AT_ISO`

Keep existing Stripe and AgentCamp env vars.

## Stripe Dashboard Prerequisites

- create or confirm the recurring `Godinez Personal` price
- keep the AgentCamp tuition prices:
  - early-bird
  - regular
- register webhook events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`

## Implementation Order

### Phase 1 — Checkout conversion

1. update AgentCamp config
2. convert AgentCamp checkout from `payment` mode to `subscription` mode
3. include the recurring `Godinez Personal` line item
4. set fixed `trial_end`

### Phase 2 — Reconciliation and billing sync

1. update AgentCamp reconcile flow to persist subscription data
2. update billing webhook to sync `trialing`, `active`, `past_due`, `cancelled`
3. confirm `accounts` records store correct Stripe subscription state

### Phase 3 — Access enforcement

1. add `hasStudioAccess(account)`
2. update chat gate
3. update workspace-creation gate
4. update billing status route

### Phase 4 — UX and verification

1. add checkout billing disclosure copy
2. verify billing gate behavior in the web app
3. validate trial-to-paid transition behavior

## Verification Matrix

### Scenario 1 — Successful checkout

Expected result:

- AgentCamp tuition is charged immediately
- Stripe customer is created
- Stripe subscription is created
- Studio user and account are created
- account stores:
  - `stripeCustomerId`
  - `subscriptionId`
  - `subscriptionStatus = "trialing"`
  - `subscriptionTier = "godinez_personal"`

### Scenario 2 — Trial access

Expected result:

- a `trialing` user can:
  - enter Studio
  - create a workspace
  - chat

### Scenario 3 — First recurring charge on July 11, 2026

Expected result:

- Stripe attempts the first monthly charge
- webhook syncs the account to `active` after successful billing
- user keeps access with no special-case logic

### Scenario 4 — Failed recurring charge on July 11, 2026

Expected result:

- webhook updates the account to `past_due`
- Studio gates block access
- existing billing recovery flow applies

## Tests To Add

### `agentcamp-checkout.test.ts`

Add assertions that the service creates Checkout in:

- `mode: "subscription"`
- with:
  - tuition line item
  - recurring `Godinez Personal` line item
  - fixed `trial_end`

### `agentcamp-reconcile.test.ts`

Add assertions that a completed checkout:

- creates the Studio account
- marks the registration paid
- stores:
  - `subscriptionId`
  - `subscriptionStatus = "trialing"`
  - `subscriptionTier = "godinez_personal"`

### `billing.test.ts`

Add assertions that:

- `trialing` is treated as access-allowed
- `active` is treated as access-allowed
- `past_due` is blocked
- `cancelled` is blocked

### New tests for `hasStudioAccess()`

Add:

- returns `true` for `trialing`
- returns `true` for `active`
- returns `false` for `free`
- returns `false` for `past_due`
- returns `false` for `cancelled`

## Risks

- if `trial_end` is configured with the wrong timezone timestamp, the first charge can happen at the wrong moment
- if the webhook does not sync `trialing` correctly, students will be incorrectly blocked from Studio
- if the checkout UI does not clearly disclose the July 11 recurring billing start, support load will increase

## Open Decisions

- exact recurring price/currency for `Godinez Personal`
- exact pre-checkout copy for recurring billing disclosure
- whether to add `customer.subscription.trial_will_end` email reminders before July 11, 2026

## References

The Stripe behavior assumed in this plan is based on:

- mixed carts in Checkout subscription mode
- free trials on subscriptions
- Checkout session creation behavior

Sources:

- https://docs.stripe.com/payments/checkout/how-checkout-works
- https://docs.stripe.com/billing/subscriptions/trials
- https://docs.stripe.com/api/checkout/sessions/create
