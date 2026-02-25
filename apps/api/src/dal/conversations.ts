import { eq, desc, and } from "drizzle-orm";
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
  const [message] = await db.insert(messages).values(data).returning();
  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  return message;
}
