# OpenClaw Instance Provisioning Runbook

How to provision a new EC2 instance running OpenClaw Gateway for Godinez Studio.

## Reference Instance

The current production setup (instance `godin-002`):

```
EC2 ip-172-31-81-169  (us-east-1, Ubuntu)
├── User: devrel-frutero
├── OpenClaw: 2026.2.19-2
├── Node: 22+
├── Gateway: port 18789, bind loopback, auth token
├── Tunnel: Cloudflare Tunnel → wss://godin-002-openclaw-gateway.godinez.ai
├── Agent slots: godin-slot-{1..15}
├── Workspace base: /home/devrel-frutero/.openclaw/workspaces/
├── Model: anthropic/claude-sonnet-4-6
├── maxConcurrent: 4 (shared across all agents)
├── Hooks: boot-md, command-logger, session-memory
└── Existing "main" agent (Telegram + Discord) — do not touch
```

## Prerequisites

- AWS account with EC2 access (us-east-1 or target region)
- Cloudflare account with access to `godinez.ai` zone (Account B)
- Anthropic API key (for the OpenClaw instance's Claude usage)
- GitHub PAT with `repo` scope (for github-worker skill, if needed)
- SSH key pair for the new instance

## Step 1 — Provision EC2

Launch an Ubuntu 22.04+ instance. Recommended specs:

| Spec | Minimum | Recommended |
|------|---------|-------------|
| Instance type | t3.medium | t3.large |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB gp3 | 40 GB gp3 |
| Region | us-east-1 | same as current |

Security group rules:

| Port | Source | Purpose |
|------|--------|---------|
| 22 | your IP / bastion | SSH |
| 18789 | 127.0.0.1 only | Gateway (Cloudflare Tunnel handles external access) |

> Gateway binds to loopback — external access goes through Cloudflare Tunnel, not a public port.

```bash
# tag the instance for identification
# naming convention: godin-{NNN} (e.g. godin-003, godin-004)
INSTANCE_NAME="godin-003"
```

## Step 2 — System Setup

SSH into the new instance and install dependencies.

```bash
# update system
sudo apt update && sudo apt upgrade -y

# install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# install pnpm (for skill dependencies)
npm install -g pnpm@latest

# verify
node --version   # must be >= 22
pnpm --version

# create service user (or use default ubuntu user)
sudo useradd -m -s /bin/bash openclaw
sudo su - openclaw
```

## Step 3 — Install OpenClaw

```bash
# as the openclaw user
npm install -g openclaw@latest

# verify
openclaw --version

# create directory structure
mkdir -p ~/.openclaw/workspaces
mkdir -p ~/.openclaw/workspace/skills
```

## Step 4 — Configure OpenClaw

Create `~/.openclaw/config.json`. This is the core config — adapt from the template below.

```json
{
  "meta": {
    "lastTouchedVersion": "2026.2.25"
  },
  "gateway": {
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "GENERATE_WITH_openssl_rand_-hex_32"
    },
    "reload": {
      "mode": "hybrid",
      "debounceMs": 300
    }
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "models": {
        "primary": "anthropic/claude-sonnet-4-6"
      }
    },
    "maxConcurrent": 4,
    "subagents": {
      "maxConcurrent": 8
    }
  },
  "hooks": {
    "enabled": true,
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": { "enabled": true },
        "command-logger": { "enabled": true },
        "session-memory": { "enabled": true }
      }
    }
  },
  "skills": {
    "load": {
      "extraDirs": [
        "~/.openclaw/workspace/skills"
      ]
    },
    "entries": {}
  },
  "channels": {},
  "env": {
    "vars": {
      "ANTHROPIC_API_KEY": "sk-ant-..."
    }
  }
}
```

Generate the gateway token:

```bash
TOKEN=$(openssl rand -hex 32)
echo "Gateway token: $TOKEN"
# paste into config.json gateway.auth.token
# also save for Step 7 (Railway env var)
```

Set permissions:

```bash
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/config.json
```

## Step 5 — Install Cloudflare Tunnel

The tunnel exposes the loopback gateway to the internet via Cloudflare, avoiding public ports.

```bash
# install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# authenticate (opens browser or use service token)
cloudflared tunnel login

# create tunnel — naming convention: godin-{NNN}-openclaw-gateway
TUNNEL_NAME="${INSTANCE_NAME}-openclaw-gateway"
cloudflared tunnel create $TUNNEL_NAME

# note the tunnel UUID from output
TUNNEL_ID="<uuid-from-output>"
```

Create tunnel config at `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/openclaw/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: godin-003-openclaw-gateway.godinez.ai
    service: ws://localhost:18789
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Add DNS record:

```bash
cloudflared tunnel route dns $TUNNEL_NAME godin-003-openclaw-gateway.godinez.ai
```

Install as systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Step 6 — Start Gateway & Verify

```bash
# start gateway (foreground first to verify)
openclaw gateway run --verbose

# expected output:
# Gateway listening on 127.0.0.1:18789
# Auth mode: token
# ...

# verify from the instance
curl -s http://localhost:18789/health

# verify through tunnel (from your laptop)
wscat -c wss://godin-003-openclaw-gateway.godinez.ai
# should connect (then fail auth — that's expected)
```

Install gateway as systemd service for persistence:

```bash
# option A: openclaw's built-in daemon installer
openclaw onboard --install-daemon

# option B: manual systemd unit
sudo tee /etc/systemd/system/openclaw-gateway.service << 'EOF'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/home/openclaw/.openclaw
Environment="PATH=/usr/local/bin:/usr/bin"
Environment="NODE_ENV=production"
ExecStart=/usr/local/bin/openclaw gateway run --verbose
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=openclaw-gateway

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable openclaw-gateway
sudo systemctl start openclaw-gateway

# check status
sudo systemctl status openclaw-gateway
sudo journalctl -u openclaw-gateway -f
```

## Step 7 — Connect to Godinez Studio API

> **Current limitation:** The API connects to a single gateway via `OPENCLAW_GATEWAY_URL`. Multi-instance routing is not yet implemented. For now, deploy a separate API service per gateway or manually reassign the env var.

Set these Railway env vars on the API service that will use this instance:

```
OPENCLAW_GATEWAY_URL=wss://godin-003-openclaw-gateway.godinez.ai
OPENCLAW_GATEWAY_TOKEN=<token-from-step-4>
AGENT_MAX_SLOTS=15
AGENT_WORKSPACE_BASE=/home/openclaw/.openclaw/workspaces
```

The API will connect on startup (`apps/api/src/index.ts:79`):

```typescript
if (process.env.OPENCLAW_GATEWAY_URL) {
  gateway.connect(process.env.OPENCLAW_GATEWAY_URL, process.env.OPENCLAW_GATEWAY_TOKEN!)
}
```

Verify: provision a test workspace from the Studio UI. Check API logs for `[Gateway] Connected` and `[Provision] Agent created`.

## Step 8 — Install Skills (Optional)

If this instance needs the github-worker skill:

```bash
# clone skills repo
git clone https://github.com/fruteroclub/godinez-skills.git /tmp/godinez-skills

# copy skill to workspace
cp -r /tmp/godinez-skills/godinez-github-worker ~/.openclaw/workspace/skills/

# add to config.json
# skills.entries:
#   "godinez-github-worker": {
#     "enabled": true,
#     "apiKey": "<github-pat>"
#   }
# skills.load.extraDirs should already include "~/.openclaw/workspace/skills"

# restart gateway to pick up skills
sudo systemctl restart openclaw-gateway
```

## Step 9 — Verify End-to-End

Run through the complete flow:

```bash
# 1. gateway health
curl -s http://localhost:18789/health

# 2. list agents (should be empty on fresh instance)
openclaw gateway call agents.list

# 3. from Studio UI: create workspace → onboarding → provision agent
#    check API logs for:
#    [Provision] Listing agents...
#    [Provision] Creating agent: godin-slot-1
#    [Provision] Agent created: <agentId>
#    [Provision] SOUL.md injected for godin-slot-1

# 4. send a chat message — verify SSE streaming works

# 5. check workspace files were created
ls -la ~/.openclaw/workspaces/godin-slot-1/
# should contain: SOUL.md, MEMORY.md, IDENTITY.md, etc.
```

## Capacity Planning

Per-instance limits:

| Resource | Value | Notes |
|----------|-------|-------|
| Agent slots | 15 | `AGENT_MAX_SLOTS` env var, soft limit |
| Concurrent requests | 4 | `agents.maxConcurrent` in config.json |
| Subagent concurrency | 8 | `agents.subagents.maxConcurrent` |
| Workspace disk | ~5 MB/agent | Grows with MEMORY.md, session logs |

**When to add a new instance:**
- Agent slots full (15 workspaces per instance)
- CPU/RAM saturation from concurrent requests
- Latency increase on chat responses (contention)

**Scaling the slot limit:** Increasing `AGENT_MAX_SLOTS` beyond 15 works but increases contention on `maxConcurrent`. If bumping slots, also bump `maxConcurrent` proportionally (rule of thumb: 1 concurrent per 4 slots).

## Instance Registry (Manual)

Until multi-instance routing is built, track instances manually:

| Instance | Gateway URL | Token | Slots | Status |
|----------|-------------|-------|-------|--------|
| godin-002 | `wss://godin-002-openclaw-gateway.godinez.ai` | (in Railway) | 1-15 | active |
| godin-003 | `wss://godin-003-openclaw-gateway.godinez.ai` | (in Railway) | 1-15 | pending |

## Teardown

To decommission an instance:

1. Migrate active workspaces (reassign `agentSlot` in DB, re-provision on target instance)
2. Stop gateway: `sudo systemctl stop openclaw-gateway`
3. Remove tunnel: `cloudflared tunnel delete $TUNNEL_NAME`
4. Remove DNS record from Cloudflare
5. Terminate EC2 instance
6. Remove from instance registry

## What's Next (Layer 2 — Multi-Instance Routing)

Not yet built. When needed, the API will require:

1. **Instance registry** — DB table mapping `instance_id` → gateway URL + token + capacity
2. **Gateway pool** — Replace singleton `gateway-relay.ts` with a connection pool keyed by instance
3. **Routing logic** — Provision endpoint picks instance with available capacity
4. **Workspace binding** — `workspaces.instanceId` column to persist which gateway owns the workspace
5. **Health checks** — Periodic pings to detect offline instances, circuit breaker on failures
6. **Migration tooling** — Move workspace between instances (re-create agent + re-inject files)
