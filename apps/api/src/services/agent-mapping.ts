import { getWorkspaceById } from "../dal/workspaces";

export function getSessionKey(
  agentSlot: string,
  session = "main",
): string {
  return `agent:${agentSlot}:${session}`;
}

export async function resolveAgentSession(
  workspaceId: number,
  conversationId?: number,
): Promise<string> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace?.agentSlot) {
    throw new Error("No agent assigned to this workspace");
  }
  // Each conversation gets its own session so boot-md re-reads workspace files
  const session = conversationId ? `conv-${conversationId}` : "main";
  return getSessionKey(workspace.agentSlot, session);
}
