import { getWorkspaceById } from "../dal/workspaces";

export function getSessionKey(
  agentSlot: string,
  session = "main",
): string {
  return `agent:${agentSlot}:${session}`;
}

export async function resolveAgentSession(
  workspaceId: number,
): Promise<string> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace?.agentSlot) {
    throw new Error("No agent assigned to this workspace");
  }
  return getSessionKey(workspace.agentSlot);
}
