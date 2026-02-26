import type { ActionBlock, ActionType } from "@godinez/types";

const ACTION_BLOCK_RE = /:::action\n([\s\S]*?):::/g;
const TITLE_BLOCK_RE = /:::title\n([\s\S]*?):::/g;
const VALID_TYPES = new Set<ActionType>([
  "create_project",
  "create_task",
  "create_file",
]);

/**
 * Parse :::action blocks from agent message text (client-side mirror of server parser).
 */
export function parseActionBlocks(text: string): ActionBlock[] {
  const blocks: ActionBlock[] = [];
  let match: RegExpExecArray | null;

  ACTION_BLOCK_RE.lastIndex = 0;

  while ((match = ACTION_BLOCK_RE.exec(text)) !== null) {
    const body = match[1].trim();
    const parsed = parseBlockBody(body);
    if (parsed) blocks.push(parsed);
  }

  return blocks;
}

/**
 * Strip :::action and :::title blocks from text, leaving only prose for markdown rendering.
 */
export function stripActionBlocks(text: string): string {
  return text.replace(ACTION_BLOCK_RE, "").replace(TITLE_BLOCK_RE, "").trim();
}

function parseBlockBody(body: string): ActionBlock | null {
  const fields: Record<string, string> = {};
  const payloadLines: string[] = [];
  let inPayload = false;

  for (const line of body.split("\n")) {
    if (inPayload) {
      if (line.startsWith("  ")) {
        payloadLines.push(line.slice(2));
      } else {
        inPayload = false;
      }
    }

    if (!inPayload) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      if (key === "payload") {
        inPayload = true;
      } else {
        fields[key] = value;
      }
    }
  }

  const type = fields["type"] as ActionType | undefined;
  const label = fields["label"];

  if (!type || !VALID_TYPES.has(type) || !label) return null;

  const payload = parsePayloadLines(payloadLines);
  const id = hashAction(type, payload);

  return { id, type, label, payload };
}

function parsePayloadLines(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

function hashAction(type: string, payload: Record<string, unknown>): string {
  // Simple deterministic hash for client — matches server by actionId
  // Note: actual IDs come from server (crypto.sha256), this is only used
  // for client-side parsing of streaming text before server confirms
  const input = `${type}:${JSON.stringify(payload)}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(12, "0").slice(0, 12);
}
