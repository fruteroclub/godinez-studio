import { eq, desc } from "drizzle-orm";
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

export async function createConversation(data: {
  workspaceId: number;
  agentId: number;
  projectId?: number;
  title?: string;
}) {
  const [conversation] = await db
    .insert(conversations)
    .values(data)
    .returning();
  return conversation;
}
