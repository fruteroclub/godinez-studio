import { eq, desc, and, count } from "drizzle-orm";
import { conversations, messages } from "@godinez/db";
import { db } from "../db";

export async function getConversationsByWorkspaceId(workspaceId: number) {
  return db.query.conversations.findMany({
    where: eq(conversations.workspaceId, workspaceId),
    orderBy: desc(conversations.lastMessageAt),
  });
}

export async function getConversationById(id: number) {
  return db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
}

export async function getMessages(conversationId: number) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: messages.createdAt,
  });
}

export async function getConversationsByProject(
  workspaceId: number,
  projectId: number,
) {
  return db.query.conversations.findMany({
    where: and(
      eq(conversations.workspaceId, workspaceId),
      eq(conversations.projectId, projectId),
    ),
    orderBy: desc(conversations.lastMessageAt),
  });
}

export async function createConversation(data: {
  workspaceId: number;
  agentId: number;
  projectId?: number;
  title?: string;
  isHackathon?: boolean;
<<<<<<< Updated upstream
  hackathonId?: number;
=======
>>>>>>> Stashed changes
}) {
  const [conversation] = await db
    .insert(conversations)
    .values(data)
    .returning();
  return conversation;
}

<<<<<<< Updated upstream
// Get or create hackathon conversation for a SPECIFIC hackathon
export async function getOrCreateHackathonConversation(
  workspaceId: number,
  agentId: number,
  hackathonId: number,
  hackathonName: string,
) {
  // First, try to find existing conversation for this specific hackathon
  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.hackathonId, hackathonId),
=======
// Get or create the hackathon conversation for a workspace
export async function getOrCreateHackathonConversation(
  workspaceId: number,
  agentId: number,
) {
  // First, try to find existing hackathon conversation
  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.workspaceId, workspaceId),
      eq(conversations.isHackathon, true),
    ),
>>>>>>> Stashed changes
  });
  
  if (existing) {
    return existing;
  }
  
  // Create new hackathon conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      workspaceId,
      agentId,
<<<<<<< Updated upstream
      hackathonId,
      title: `🏆 ${hackathonName}`,
=======
      title: "🏆 Hackathon",
>>>>>>> Stashed changes
      isHackathon: true,
    })
    .returning();
  
  return conversation;
}

<<<<<<< Updated upstream
// Get hackathon conversation by hackathonId
export async function getHackathonConversation(hackathonId: number) {
  return db.query.conversations.findFirst({
    where: eq(conversations.hackathonId, hackathonId),
=======
// Get hackathon conversation for a workspace (null if none)
export async function getHackathonConversation(workspaceId: number) {
  return db.query.conversations.findFirst({
    where: and(
      eq(conversations.workspaceId, workspaceId),
      eq(conversations.isHackathon, true),
    ),
>>>>>>> Stashed changes
  });
}

export async function createMessage(data: {
  conversationId: number;
  workspaceId: number;
  role: string;
  content: string;
  userId?: number;
  agentId?: number;
  metadata?: Record<string, unknown>;
}) {
  // Serialize metadata to JSON string for the text column
  const values = {
    ...data,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
  };
  const [message] = await db.insert(messages).values(values).returning();
  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  return message;
}

export async function getMessageById(id: number) {
  return db.query.messages.findFirst({
    where: eq(messages.id, id),
  });
}

export async function getLastAgentMessage(conversationId: number) {
  return db.query.messages.findFirst({
    where: and(
      eq(messages.conversationId, conversationId),
      eq(messages.role, "agent"),
    ),
    orderBy: desc(messages.createdAt),
  });
}

export async function updateMessageMetadata(
  id: number,
  metadata: Record<string, unknown>,
) {
  const [message] = await db
    .update(messages)
    .set({ metadata: JSON.stringify(metadata) })
    .where(eq(messages.id, id))
    .returning();
  return message;
}

export async function linkConversationToProject(
  conversationId: number,
  projectId: number,
) {
  const [conversation] = await db
    .update(conversations)
    .set({ projectId })
    .where(eq(conversations.id, conversationId))
    .returning();
  return conversation;
}

export async function updateConversationTitle(
  conversationId: number,
  title: string,
) {
  const [conversation] = await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, conversationId))
    .returning();
  return conversation;
}

export async function getMessageCountForConversation(
  conversationId: number,
): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return result?.total ?? 0;
}

export async function deleteConversation(id: number) {
  // Messages cascade via FK, but explicit delete for clarity
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
}

// Delete hackathon conversation by hackathonId
export async function deleteHackathonConversation(hackathonId: number) {
  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.hackathonId, hackathonId),
  });
  
  if (existing) {
    // Delete messages first (foreign key constraint)
    await db.delete(messages).where(eq(messages.conversationId, existing.id));
    // Delete conversation
    await db.delete(conversations).where(eq(conversations.id, existing.id));
  }
  
  return { deleted: !!existing };
}

export async function updateMessageActionStatus(
  messageId: number,
  actionId: string,
  status: "completed" | "error",
): Promise<void> {
  const msg = await getMessageById(messageId);
  if (!msg?.metadata) return;
  try {
    const meta = JSON.parse(msg.metadata as string);
    if (!Array.isArray(meta.actions)) return;
    meta.actions = meta.actions.map((a: Record<string, unknown>) =>
      a.id === actionId ? { ...a, status } : a,
    );
    await updateMessageMetadata(messageId, meta);
  } catch {
    // If metadata is malformed, skip silently
  }
}

export async function updateConversation(
  conversationId: number,
  data: { title?: string; isStarred?: boolean },
) {
  const [conversation] = await db
    .update(conversations)
    .set(data)
    .where(eq(conversations.id, conversationId))
    .returning();
  return conversation;
}
