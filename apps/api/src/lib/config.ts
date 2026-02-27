/**
 * Centralized configuration for magic numbers and environment-dependent values.
 */

// OpenClaw agent provisioning
export const AGENT_MAX_SLOTS = parseInt(process.env.AGENT_MAX_SLOTS || "5", 10);
export const AGENT_WORKSPACE_BASE =
  process.env.AGENT_WORKSPACE_BASE || "/home/devrel-frutero/.openclaw/workspaces";

// Workspace sync (WORKSPACE.md push to agent filesystem)
export const SYNC_DEBOUNCE_MS = parseInt(process.env.SYNC_DEBOUNCE_MS || "5000", 10);
export const SYNC_MAX_TASKS = 30;
export const SYNC_MAX_FILES = 10;
