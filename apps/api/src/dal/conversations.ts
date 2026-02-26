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
  agentId?: number;
  projectId?: number;
  title?: string;
}) {
  const [conversation] = await db
    .insert(conversations)
    .values(data)
    .returning();
  return conversation;
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
