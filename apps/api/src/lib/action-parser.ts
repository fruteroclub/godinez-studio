import type { ActionBlock, ActionType } from "@godinez/types";
import { createHash } from "node:crypto";

const ACTION_BLOCK_RE = /:::action\n([\s\S]*?):::/g;
const VALID_TYPES = new Set<ActionType>([
  "create_project",
  "create_task",
  "create_file",
  "hackathon_advance",
  "hackathon_note",
]);

/**
 * Parse :::action blocks from agent message text.
 * Returns parsed ActionBlock[] (status not set — caller promotes to ActionCard).
 */
export function parseActionBlocks(text: string): ActionBlock[] {
  const blocks: ActionBlock[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  ACTION_BLOCK_RE.lastIndex = 0;

  while ((match = ACTION_BLOCK_RE.exec(text)) !== null) {
    const body = match[1].trim();
    const parsed = parseBlockBody(body);
    if (parsed) blocks.push(parsed);
  }

  return blocks;
}

/**
 * Strip :::action blocks from text, leaving only prose.
 */
export function stripActionBlocks(text: string): string {
  return text.replace(ACTION_BLOCK_RE, "").trim();
}

function parseBlockBody(body: string): ActionBlock | null {
  const fields: Record<string, string> = {};
  const payloadLines: string[] = [];
  let inPayload = false;

  for (const line of body.split("\n")) {
    if (inPayload) {
      // Payload lines are indented with 2 spaces
      if (line.startsWith("  ")) {
        payloadLines.push(line.slice(2));
      } else {
        inPayload = false;
        // Fall through to parse as top-level field
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
  const input = `${type}:${JSON.stringify(payload)}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}
