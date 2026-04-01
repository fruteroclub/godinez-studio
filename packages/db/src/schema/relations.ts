import { relations } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { workspaceMembers } from "./workspace-members";
import { agents } from "./agents";
import { projects } from "./projects";
import { conversations } from "./conversations";
import { messages } from "./messages";
import { tasks } from "./tasks";
import { files } from "./files";
import { agentLogs } from "./agent-logs";
import { referralCodes } from "./referral-codes";
import { gatewayInstances } from "./gateway-instances";
import { hackathonProgress } from "./hackathon-progress";
import { runContexts } from "./run-contexts";
import { accounts } from "./accounts";

export const usersRelations = relations(users, ({ one, many }) => ({
  account: one(accounts, {
    fields: [users.id],
    references: [accounts.ownerId],
  }),
  ownedWorkspaces: many(workspaces),
  memberships: many(workspaceMembers),
  messages: many(messages),
  tasks: many(tasks),
  files: many(files),
  redeemedReferralCodes: many(referralCodes),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  workspaces: many(workspaces),
  conversations: many(conversations),
  messages: many(messages),
  tasks: many(tasks),
  logs: many(agentLogs),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [workspaces.agentId],
    references: [agents.id],
  }),
  instance: one(gatewayInstances, {
    fields: [workspaces.instanceId],
    references: [gatewayInstances.id],
  }),
  members: many(workspaceMembers),
  projects: many(projects),
  conversations: many(conversations),
  tasks: many(tasks),
  files: many(files),
  agentLogs: many(agentLogs),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  conversations: many(conversations),
  tasks: many(tasks),
  files: many(files),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [conversations.workspaceId],
      references: [workspaces.id],
    }),
    project: one(projects, {
      fields: [conversations.projectId],
      references: [projects.id],
    }),
    agent: one(agents, {
      fields: [conversations.agentId],
      references: [agents.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  workspace: one(workspaces, {
    fields: [messages.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [messages.agentId],
    references: [agents.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedAgent: one(agents, {
    fields: [tasks.assignedAgentId],
    references: [agents.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [files.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  uploadedByUser: one(users, {
    fields: [files.uploadedByUserId],
    references: [users.id],
  }),
  uploadedByAgent: one(agents, {
    fields: [files.uploadedByAgentId],
    references: [agents.id],
  }),
  message: one(messages, {
    fields: [files.messageId],
    references: [messages.id],
  }),
}));

export const referralCodesRelations = relations(referralCodes, ({ one }) => ({
  redeemedBy: one(users, {
    fields: [referralCodes.redeemedByUserId],
    references: [users.id],
  }),
}));

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [agentLogs.workspaceId],
    references: [workspaces.id],
  }),
  agent: one(agents, {
    fields: [agentLogs.agentId],
    references: [agents.id],
  }),
}));

export const gatewayInstancesRelations = relations(
  gatewayInstances,
  ({ many }) => ({
    workspaces: many(workspaces),
  }),
);

export const hackathonProgressRelations = relations(hackathonProgress, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [hackathonProgress.workspaceId],
    references: [workspaces.id],
  }),
}));

export const runContextsRelations = relations(runContexts, ({ one }) => ({
  conversation: one(conversations, {
    fields: [runContexts.conversationId],
    references: [conversations.id],
  }),
  workspace: one(workspaces, {
    fields: [runContexts.workspaceId],
    references: [workspaces.id],
  }),
  instance: one(gatewayInstances, {
    fields: [runContexts.instanceId],
    references: [gatewayInstances.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  owner: one(users, {
    fields: [accounts.ownerId],
    references: [users.id],
  }),
}));
