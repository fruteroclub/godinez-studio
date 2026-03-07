/**
 * Centralized configuration for magic numbers and environment-dependent values.
 */

// OpenClaw agent provisioning
export const AGENT_MAX_SLOTS = parseInt(process.env.AGENT_MAX_SLOTS || "15", 10);
export const AGENT_WORKSPACE_BASE =
  process.env.AGENT_WORKSPACE_BASE || "/home/devrel-frutero/.openclaw/workspaces";

// Workspace sync (WORKSPACE.md push to agent filesystem)
export const SYNC_DEBOUNCE_MS = parseInt(process.env.SYNC_DEBOUNCE_MS || "5000", 10);
export const SYNC_MAX_TASKS = 30;
export const SYNC_MAX_FILES = 10;

// Gateway pool
export const POOL_IDLE_TIMEOUT_MS = parseInt(process.env.POOL_IDLE_TIMEOUT_MS || "600000", 10); // 10 min
export const POOL_HEALTH_INTERVAL_MS = parseInt(process.env.POOL_HEALTH_INTERVAL_MS || "60000", 10); // 60s
export const LEGACY_INSTANCE_NAME = process.env.LEGACY_INSTANCE_NAME || "godin-001";
