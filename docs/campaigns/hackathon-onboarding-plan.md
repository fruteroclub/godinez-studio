# Hackathon Participant Onboarding Flow

## Context

We're provisioning godin-003 as a dedicated instance for The Synthesis hackathon (14-day online hackathon, agents + humans build together). We need a pipeline to capture qualified hackathon participants on godinez.ai, let admin review and approve them, auto-send a referral code pinned to godin-003, and onboard them through a shortened wizard that configures their agent for the hackathon.

Currently referral codes and instance assignment are completely decoupled — there's no way to route a user to a specific instance. The onboarding wizard is generic (4 steps, business-focused), not hackathon-aware.

---

## Flow

```
godinez.ai/hackathon (form)
  → Convex hackathonSignups table
  → Admin reviews in godinez.ai/admin
  → Approves → generates instance-pinned referral code (HACK-XXXXXX) + sends email via Resend
  → Participant clicks link → studio /sign-up?code=HACK-XXXXXX
  → Validate returns { valid, onboardingFlow: "hackathon", metadata, instanceId }
  → Store in sessionStorage, Clerk signup, redeem code
  → Navigate to /studio → OnboardingWizard detects hackathon flow
  → 2-step wizard (agent name + project idea → launch)
  → Provision hits godin-003 directly (instanceId override), injects hackathon SOUL.md
```

---

## Phase 1: Instance-Pinned Referral Codes (godinez-studio)

No dependencies. Can be built in parallel with Phase 2.

### 1A. Schema: add columns to `referral_codes`

**File:** `packages/db/src/schema/referral-codes.ts`

Add 3 nullable columns:
- `instanceId` — integer FK to `gateway_instances.id`, `onDelete: "set null"`
- `metadata` — jsonb, stores participant data from hackathon form (name, background, problemToSolve, etc.)
- `onboardingFlow` — varchar(50), `"default"` or `"hackathon"`, tells frontend which wizard to show

Generate + push migration.

### 1B. DAL updates

**File:** `apps/api/src/dal/referral-codes.ts`

- `createReferralCode()` — accept optional `instanceId`, `metadata`, `onboardingFlow`; support `HACK-` prefix when `onboardingFlow === "hackathon"`
- `validateReferralCode()` — return `instanceId`, `metadata`, `onboardingFlow` alongside `valid` and `email`

### 1C. Route updates

**File:** `apps/api/src/routes/referral-codes.ts`
- `POST /` (service-to-service) — extend Zod schema with `instanceId`, `metadata`, `onboardingFlow`
- `POST /validate` — return `onboardingFlow`, `metadata`, `instanceId` in response

**File:** `apps/api/src/routes/admin.ts`
- `POST /api/admin/referral-codes` — extend Zod schema to match

### 1D. Provisioning override

**File:** `apps/api/src/routes/provision.ts`

Add `instanceId?: number` to provision Zod schema. When present:
- Skip `pool.pickInstance()`, use `getInstanceById(instanceId)` directly
- Validate instance is active and has capacity
- Rest of flow unchanged

**File:** `apps/web/src/hooks/use-provision.ts`
- Add `instanceId?: number` to `ProvisionInput`

---

## Phase 2: Hackathon Signup Form (godinez-ai)

No dependencies. Can be built in parallel with Phase 1.

### 2A. Convex table: `hackathonSignups`

**File:** `convex/schema.ts`

Fields (aligned with Synthesis registration humanInfo):
- `name`, `email` (required)
- `socialHandle` (optional)
- `background`: builder | product | designer | student | founder | other
- `cryptoExperience`: yes | no | a_little
- `aiAgentExperience`: yes | no | a_little
- `codingComfort`: 1-10
- `problemToSolve` (required — the key filter for admin)
- `status`: pending | approved | rejected (default: pending)
- `source`: "synthesis-hackathon"
- `referralCode`, `approvedAt` (set on approval)
- `createdAt`

### 2B. Convex functions

**File:** `convex/hackathonSignups.ts` (new, pattern from `convex/waitlist.ts`)

- `add` mutation — insert or update by email (dedup)
- `list` query — all, ordered by createdAt desc
- `listPending` query — status === "pending"
- `markApproved` mutation — set status, referralCode, approvedAt

### 2C. Hackathon signup page + form

**File:** `src/app/hackathon/page.tsx` (new)
**File:** `src/components/HackathonSignupForm.tsx` (new, pattern from WaitlistForm.tsx)

Quick form (~2-3 min):
1. Nombre (text, required)
2. Email (text, required)
3. Handle social (text, optional, @username)
4. Background (select: Builder/Product/Designer/Student/Founder/Otro)
5. Experiencia crypto (radio: Sí/No/Un poco)
6. Experiencia con agentes AI (radio: Sí/No/Un poco)
7. Comfort con código, 1-10 (slider or input)
8. ¿Qué vas a construir? (textarea, required — key filter)

Success screen confirms submission, "te contactaremos pronto".

### 2D. Content strings

**File:** `src/lib/content.ts` — add `hackathon` section (Spanish)
**File:** `src/lib/content-en.ts` — matching English

---

## Phase 3: Admin Review + Auto-Email (godinez-ai)

Depends on Phase 1 (instanceId on codes) and Phase 2 (Convex table).

### 3A. Admin hackathon panel

**File:** `src/app/admin/page.tsx`

Add "Hackathon" tab/section alongside existing waitlist table. Shows hackathonSignups:
- Columns: Name, Email, Background, Coding, Problem to Solve, Status, Action
- "Aprobar" button triggers hackathon-invite endpoint

### 3B. Hackathon invite API endpoint

**File:** `src/app/api/admin/hackathon-invite/route.ts` (new, pattern from `src/app/api/admin/invite/route.ts`)

On approve:
1. Call studio API `POST /api/referral-codes` with:
   - `email`, `name`, `source: "synthesis-hackathon"`
   - `instanceId: <godin-003 ID>` (env var `HACKATHON_INSTANCE_ID`)
   - `onboardingFlow: "hackathon"`
   - `metadata: { name, background, problemToSolve, socialHandle, codingComfort, cryptoExperience, aiAgentExperience }`
2. Send hackathon-specific email via Resend (different template from beta invite — mentions Synthesis, explains the agent, includes code + signup link)
3. Update Convex: `hackathonSignups.markApproved({ id, referralCode })`

### 3C. Env vars

- `HACKATHON_INSTANCE_ID` — godin-003's DB id (avoids hardcoding)
- Existing: `RESEND_API_KEY`, `STUDIO_API_URL`, `STUDIO_SERVICE_KEY`

---

## Phase 4: Shortened Onboarding Wizard (godinez-studio)

Depends on Phase 1.

### 4A. SignUp page — pass metadata through

**File:** `apps/web/src/pages/SignUp.tsx`

After successful `/validate`, store extra fields in sessionStorage:
```
sessionStorage.setItem("onboardingFlow", res.onboardingFlow || "default")
sessionStorage.setItem("referralMetadata", JSON.stringify(res.metadata || {}))
sessionStorage.setItem("referralInstanceId", res.instanceId?.toString() || "")
```

### 4B. Hackathon wizard flow

**File:** `apps/web/src/pages/OnboardingWizard.tsx`

Read `onboardingFlow` from sessionStorage. If `"hackathon"`:

**Step 1 — "Configura tu agente para Synthesis":**
- Nombre de tu agente (text, required)
- ¿Qué vas a construir? (textarea, pre-filled from metadata.problemToSolve, editable)

**Step 2 — Review + Launch:**
- Shows agent name + project summary
- "Activar agente" button

Auto-derived (not shown to user):
- Workspace name: `"{metadata.name} - Synthesis"`
- User name: from `metadata.name`
- Role: mapped from `metadata.background` (builder→tech, founder→founder, etc.)
- Personality: `"technical"` (best for hackathon builders)
- Needs: `["build", "launch"]`
- Business description: from `metadata.problemToSolve`

On launch, pass `instanceId` (from sessionStorage) to provision mutation.

Clean up all sessionStorage keys after launch.

### 4C. Content strings

**File:** `apps/web/src/lib/content.ts`

Add `hackathonOnboarding` section:
- `step1Title`: "Configura tu agente para Synthesis"
- `agentNameLabel`, `agentNamePlaceholder`
- `buildingLabel`: "¿Qué vas a construir?"
- `buildingPlaceholder`
- `launchCta`: "Activar agente"
- `launching`: "Preparando tu agente..."

---

## Phase 5: Hackathon SOUL.md Template (godinez-studio)

Depends on Phase 1.

### 5A. Template function

**File:** `apps/api/src/services/agent-soul-template.ts`

Add `buildHackathonSoulMd(ctx)` alongside existing `buildSoulMd`. Context includes:
- `agentName`, `userName`, `problemToSolve`
- All existing :::action block protocol, WORKSPACE.md context, web dev Lab

Hackathon-specific additions:
- Knows about The Synthesis: name, timeline, registration at `synthesis.devfolio.co`
- Understands the participant's project idea
- First message proposes project structure and next steps
- Includes registration API format (POST /register payload) so agent can help register
- References the 9-phase hackathon workflow (existing `hackathon_progress` table)

### 5B. Provisioning integration

**File:** `apps/api/src/routes/provision.ts`

Add `onboardingFlow?: string` and `problemToSolve?: string` to Zod schema.
When `onboardingFlow === "hackathon"`:
- Call `buildHackathonSoulMd` instead of `buildSoulMd`
- Auto-create `hackathon_progress` record for the workspace

---

## Build order

```
Phase 1 (studio: schema + codes)  ──┐
                                     ├── Phase 3 (godinez-ai: admin + email)
Phase 2 (godinez-ai: form + Convex) ┘         │
                                               ├── Integration test
Phase 4 (studio: wizard) ─── needs Phase 1 ───┘
Phase 5 (studio: SOUL.md) ── needs Phase 1 ───┘
```

Phases 1 + 2 in parallel. Then 3, 4, 5 can proceed. Phase 4 + 5 are independent of each other.

---

## Verification

1. **Schema**: `pnpm db:generate && pnpm db:push` — migration applies cleanly
2. **Build**: `pnpm build && pnpm typecheck` in godinez-studio; `bun run build` in godinez-ai
3. **E2E test flow**:
   - Submit hackathon form on godinez.ai/hackathon
   - Verify record appears in admin panel
   - Approve → verify email arrives with HACK-XXXXXX code
   - Click signup link → verify shortened wizard (2 steps, not 4)
   - Launch agent → verify workspace lands on godin-003 (check admin instances panel, usedSlots incremented)
   - Verify agent's first message references the hackathon project idea
