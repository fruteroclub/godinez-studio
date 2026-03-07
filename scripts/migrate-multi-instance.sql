-- Multi-Instance Foundation Migration
-- Run AFTER `pnpm db:push` has created the gateway_instances table
-- and added the instance_id column to workspaces.
--
-- Prerequisites:
--   1. pnpm db:push (apply schema changes)
--   2. Fill in the placeholder values below
--   3. Run this script against the target database
--   4. Deploy the new API
--
-- Secrets: replace __GATEWAY_TOKEN__ with the actual token from Railway env
-- (currently stored as OPENCLAW_GATEWAY_TOKEN).

-- 1. Register godin-002 (Railway dev instance)
INSERT INTO gateway_instances (
  name, url, token, tier, status, max_slots, used_slots, workspace_base, region
) VALUES (
  'godin-002',
  'wss://godin-002-openclaw-gateway.godinez.ai',
  '__GATEWAY_TOKEN__',
  'shared',
  'active',
  15,
  (SELECT COUNT(*) FROM workspaces WHERE agent_id IS NOT NULL),
  '/home/devrel-frutero/.openclaw/workspaces',
  'us-east-1'
);

-- 2. Backfill existing workspaces to point to godin-002
UPDATE workspaces
SET instance_id = (SELECT id FROM gateway_instances WHERE name = 'godin-002')
WHERE instance_id IS NULL
  AND agent_id IS NOT NULL;
