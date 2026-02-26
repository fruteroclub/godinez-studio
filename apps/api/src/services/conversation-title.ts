/**
 * Conversation title generation — heuristic + agent-suggested.
 *
 * 1. Heuristic: first sentence of the user's first message, cleaned and
 *    truncated to 60 chars. Applied immediately when the first message is sent.
 * 2. Agent-suggested: the agent can include a :::title block in its first
 *    response. If present, it overrides the heuristic title.
 */

const TITLE_BLOCK_RE = /:::title\n([\s\S]*?):::/g;
const MAX_TITLE_LENGTH = 60;

/**
 * Generate a heuristic title from the user's first message.
 * Extracts the first sentence/phrase, strips markdown, caps at 60 chars.
 */
export function generateHeuristicTitle(message: string): string {
  let text = message
    // Strip markdown headings
    .replace(/^#{1,6}\s+/gm, "")
    // Strip bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Strip inline code
    .replace(/`([^`]+)`/g, "$1")
    // Strip links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Take first sentence (up to . ? ! or newline)
  const sentenceEnd = text.search(/[.?!]\s|[\n]/);
  if (sentenceEnd > 0 && sentenceEnd < MAX_TITLE_LENGTH) {
    text = text.slice(0, sentenceEnd + 1).trim();
  }

  // Truncate
  if (text.length > MAX_TITLE_LENGTH) {
    text = text.slice(0, MAX_TITLE_LENGTH - 3).trimEnd() + "...";
  }

  // Capitalize first letter
  if (text.length > 0) {
    text = text[0].toUpperCase() + text.slice(1);
  }

  return text || "Nueva conversación";
}

/**
 * Parse a :::title block from the agent's response.
 * Returns the suggested title or null if not found.
 */
export function parseTitleBlock(text: string): string | null {
  TITLE_BLOCK_RE.lastIndex = 0;
  const match = TITLE_BLOCK_RE.exec(text);
  if (!match) return null;

  const title = match[1].trim();
  if (!title) return null;

  // Cap at max length
  if (title.length > MAX_TITLE_LENGTH) {
    return title.slice(0, MAX_TITLE_LENGTH - 3).trimEnd() + "...";
  }

  return title;
}

/**
 * Strip :::title blocks from text, leaving only prose.
 */
export function stripTitleBlocks(text: string): string {
  return text.replace(TITLE_BLOCK_RE, "").trim();
}
