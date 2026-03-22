/**
 * Conversation History Context — injects recent message history as a context
 * header so OpenClaw sessions that have been reset can maintain continuity.
 */

import { getMessages } from "../dal/conversations";
import { stripActionBlocks } from "../lib/action-parser";

interface HistoryOpts {
  maxMessages?: number;
  maxChars?: number;
}

const DEFAULTS = { maxMessages: 20, maxChars: 6000 } as const;
const CONTENT_TRUNCATE = 300;

/**
 * Build a history context header from DB messages for the given conversation.
 * Excludes the very last message (the current user message just saved).
 */
export async function buildHistoryContext(
  conversationId: number,
  opts?: HistoryOpts,
): Promise<string> {
  const { maxMessages, maxChars } = { ...DEFAULTS, ...opts };

  const allMessages = await getMessages(conversationId);

  // Need at least 2 messages (the history + the current user message just saved)
  if (allMessages.length <= 1) return "";

  // Exclude the last message (current user message)
  const history = allMessages.slice(-maxMessages - 1, -1);

  const lines: string[] = [];
  let totalChars = 0;

  for (const msg of history) {
    const role = msg.role === "user" ? "USUARIO" : "AGENTE";
    const clean = stripActionBlocks(msg.content);
    const truncated = clean.length > CONTENT_TRUNCATE
      ? clean.slice(0, CONTENT_TRUNCATE) + "…"
      : clean;
    const line = `${role}: ${truncated}`;

    if (totalChars + line.length > maxChars) break;

    lines.push(line);
    totalChars += line.length;
  }

  if (lines.length === 0) return "";

  return [
    "[Historial reciente de esta conversación — contexto para continuidad]",
    ...lines,
    "[Fin del historial]",
  ].join("\n");
}
