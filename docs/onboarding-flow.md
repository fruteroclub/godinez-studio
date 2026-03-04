# Onboarding Flow — Godinez Studio Beta

## Full Funnel: Email → First Agent Response

```mermaid
flowchart TD
    %% ── ACQUISITION (godinez-ai) ──
    subgraph ACQUISITION["Acquisition (godinez-ai)"]
        A1[Admin clicks 'Invitar' on waitlist entry]
        A2[Studio API generates BETA-XXXXXX code]
        A3[Resend sends branded email to user]
        A4[Convex waitlist marked 'invited']
        A1 --> A2 --> A3 --> A4
    end

    %% ── SIGNUP (godinez-studio) ──
    subgraph SIGNUP["Signup Gate"]
        S1["User clicks 'Crear mi cuenta' in email"]
        S2["/sign-up?code=BETA-XXXXXX"]
        S3{"Code auto-validates\nPOST /api/referral-codes/validate"}
        S3_OK["Code valid → show Clerk form"]
        S3_FAIL["Code invalid/expired\n→ manual input field"]
        S4["User creates account\n(email + password via Clerk)"]
        S5["Auto-redeem code\nPOST /api/referral-codes/redeem"]
        S6["Redirect → /studio"]

        S1 --> S2 --> S3
        S3 -->|valid| S3_OK --> S4
        S3 -->|invalid| S3_FAIL -->|retry| S3
        S4 --> S5 --> S6
    end

    %% ── WORKSPACE SELECTOR ──
    subgraph SELECT["Workspace Selector (/studio)"]
        W1{"Has workspaces?"}
        W2["Empty state:\n'Crea tu primer workspace'"]
        W3["List workspaces"]
        W4["Click 'Crear Workspace'"]

        W1 -->|no| W2 --> W4
        W1 -->|yes| W3
        W3 -->|select existing| DASH
        W3 -->|create new| W4
    end

    %% ── ONBOARDING WIZARD ──
    subgraph WIZARD["Onboarding Wizard (/studio/new) — 4 steps"]
        direction TB
        O1["Step 1: Workspace + Profile\n─────────────────────\n• Workspace name\n• Your name\n• Role (founder/marketing/sales/ops/tech/support)\n• Business description (120 chars)"]
        O2["Step 2: Needs\n─────────────────────\n• Multi-select from 8 options:\n  Launch, Automate, Social Media,\n  Sales, Save Time, Research,\n  Support, Build\n• Min 1 required"]
        O3["Step 3: Agent Personalization\n─────────────────────\n• Agent name\n• Personality: professional /\n  friendly / creative / technical"]
        O4["Step 4: Review + Launch\n─────────────────────\n• Summary of all inputs\n• 'Lanzar' button"]

        O1 --> O2 --> O3 --> O4
    end

    %% ── PROVISIONING ──
    subgraph PROVISION["Agent Provisioning (backend)"]
        P1["Create workspace in DB"]
        P2{"Gateway online?"}
        P3{"Slot available?\n(1-15)"}
        P4["Create agent on OpenClaw"]
        P5["Inject SOUL.md\n(personality + needs + business context)"]
        P6["Create DB records\n(agent, workspace link, user profile)"]
        P7["Create 'Onboarding' conversation"]

        P_ERR1["'Servicio no disponible'\n⚠ Blocked — retry later"]
        P_ERR2["'Slots ocupados'\n⚠ Blocked — capacity full"]

        P1 --> P2
        P2 -->|no| P_ERR1
        P2 -->|yes| P3
        P3 -->|no| P_ERR2
        P3 -->|yes| P4 --> P5 --> P6 --> P7
    end

    %% ── FIRST INTERACTION ──
    subgraph CHAT["First Chat (/studio/:slug/chat/:id)"]
        C1["Land in 'Onboarding' conversation"]
        C2["User sends first message"]
        C3["POST /api/chat/send → runId"]
        C4["SSE stream: GET /api/chat/stream/:runId"]
        C5["Agent responds in real-time\n(markdown + action cards)"]
        SMILE["⭐ TIME TO SMILE ⭐"]

        C1 --> C2 --> C3 --> C4 --> C5 --> SMILE
    end

    %% ── DASHBOARD (alternate path) ──
    DASH["Dashboard (/studio/:slug)\nStats + agent card"]
    DASH -->|click Chat| CHAT

    %% ── CONNECTIONS ──
    A4 -.->|user receives email| S1
    S6 --> SELECT
    W4 --> WIZARD
    O4 -->|"click 'Lanzar'"| PROVISION
    P7 -->|auto-navigate| CHAT
```

## User Input Summary

| Step | Inputs | Required | Type |
|------|--------|----------|------|
| Referral code | `code` | Yes | Text (auto-uppercase) |
| Clerk signup | Email, password | Yes | Clerk-managed |
| Workspace + profile | Workspace name, your name, role, business description | All required | Text + single-select |
| Needs | 1-8 needs from preset list | Min 1 | Multi-select |
| Agent | Agent name, personality | Name required | Text + single-select |

## Error States & Recovery

| Where | Error | User Sees | Recovery |
|-------|-------|-----------|----------|
| Code gate | Invalid/expired code | "Codigo invalido o expirado" | Enter different code |
| Code gate | No code provided | "Ingresa un codigo de invitacion" | Enter code |
| Wizard Step 1 | Missing fields | Next button disabled (no message) | Fill all fields |
| Wizard Step 2 | No needs selected | "Debes seleccionar al menos una opcion" | Select at least 1 |
| Provisioning | Gateway offline | "El servicio de agentes no esta disponible" | Wait + retry |
| Provisioning | All 15 slots full | "Todos los slots estan ocupados" | Wait + retry |
| Provisioning | Generic error | "Hubo un error al provisionar el agente" | Retry button |
| Chat | Agent silent | Spinner stays | Refresh or new conversation |

## Time-to-Smile Breakdown

```
Email received                    0:00
├─ Click link in email            0:05   (user action)
├─ Code auto-validates            0:07   (~2s API call)
├─ Fill Clerk signup form         1:00   (email + password + verify)
├─ Redirected to /studio          1:05
├─ Click "Crear Workspace"        1:10
├─ Fill Step 1 (4 fields)         2:00   (name, role, description)
├─ Select needs (Step 2)          2:20   (quick multi-select)
├─ Name agent + personality       2:40   (Step 3)
├─ Review + click Launch          2:50   (Step 4)
├─ Provisioning completes         3:00   (~10s backend)
├─ Type first message             3:15
└─ Agent responds                 3:25   ⭐ SMILE
                                  ─────
                          Total: ~3.5 min
```

## UX Improvement Opportunities

### High Impact (reduce drop-off)
1. **Merge code gate + Clerk signup** — show code field inside or above the Clerk form to reduce perceived steps
2. **Auto-navigate past WorkspaceSelector** — new users (0 workspaces) should go straight to the wizard
3. **Inline field validation on Step 1** — show red outlines on blur, not just disable Next
4. **Progress indicator during provisioning** — "Creando workspace... Configurando agente... Listo!" instead of plain spinner

### Medium Impact (reduce confusion)
5. **Add "start chatting" CTA on Dashboard** — users who land on Dashboard don't see a clear next action
6. **Pre-fill agent name** — default to something like "Mi Agente" to reduce friction on Step 3
7. **Wizard step indicator** — show "Paso 1 de 4" progress bar
8. **Handle capacity-full gracefully** — show estimated wait time or waitlist position

### Low Impact (polish)
9. **"Contact support" link on code gate errors** — currently a dead end if code doesn't work
10. **Onboarding conversation should have a welcome message** — currently empty, user must initiate
11. **Detect incomplete workspaces** — if user closed browser mid-provision, redirect back to wizard instead of showing broken dashboard
