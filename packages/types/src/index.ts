// Domain enums
export type UserRole = "user" | "admin";
export type WorkspaceTier = "beta_tester";
export type WorkspaceStatus = "active" | "suspended" | "provisioning";
export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type AgentTemplate =
  | "pmo"
  | "cto"
  | "influencer"
  | "orchestrator"
  | "custom";
export type AgentStatus =
  | "active"
  | "paused"
  | "provisioning"
  | "error"
  | "archived";
export type ProjectStatus = "active" | "completed" | "archived";
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type MessageRole = "user" | "agent" | "system";
export type LogLevel = "debug" | "info" | "warn" | "error";

// Action cards — agent-proposed resource CRUD
export type ActionType = "create_project" | "create_task" | "create_file";
export type ActionStatus = "pending" | "executing" | "completed" | "error";

export interface CreateProjectPayload {
  name: string;
  description?: string;
}

export interface CreateTaskPayload {
  title?: string;
  name?: string;
  description?: string;
  projectId?: number;
  priority?: string;
}

export interface CreateFilePayload {
  filename?: string;
  content?: string;
}

export type ActionPayload =
  | CreateProjectPayload
  | CreateTaskPayload
  | CreateFilePayload;

export interface ActionBlock {
  id: string;
  type: ActionType;
  label: string;
  payload: Record<string, unknown>;
}

export interface ActionCard extends ActionBlock {
  status: ActionStatus;
  resultId?: number;
  error?: string;
  executedAt?: string;
}

// Agent config — stored as JSONB in agents table
export interface AgentConfig {
  model?: string;
  channels?: string[];
  needs?: string[];
  personality?: string;
  userName?: string;
  userRole?: string;
  businessDescription?: string;
  customInstructions?: string;
}

// API response types
export interface Workspace {
  id: number;
  name: string;
  slug: string;
  ownerId: number;
  agentId: number | null;
  tier: WorkspaceTier;
  status: WorkspaceStatus;
  agentSlot: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  workspaceId: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  workspaceId: number;
  projectId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: number | null;
  createdByUserId: number | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: number;
  workspaceId: number;
  projectId: number | null;
  storageKey: string;
  url: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByUserId: number | null;
  uploadedByAgentId: number | null;
  messageId: number | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  workspaceId: number;
  projectId: number | null;
  agentId: number;
  title: string | null;
  channel: string;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  workspaceId: number;
  role: MessageRole;
  content: string;
  userId: number | null;
  agentId: number | null;
  metadata: string | null;
  fileId: number | null;
  createdAt: string;
}

export interface Agent {
  id: number;
  name: string;
  slug: string;
  template: AgentTemplate;
  status: AgentStatus;
  config: AgentConfig | null;
  openclawId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId: number;
  role: MemberRole;
  createdAt: string;
}

// Chat streaming events
export interface ChatDeltaEvent {
  type: "delta";
  text: string;
}
export interface ChatDoneEvent {
  type: "done";
  text: string;
  messageId: number;
  actions?: ActionCard[];
}
export interface ChatErrorEvent {
  type: "error";
  error: string;
}
export type ChatStreamEvent = ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent;

// API request types
export interface CreateWorkspaceRequest {
  name: string;
}
export interface UpdateWorkspaceRequest {
  name?: string;
  tier?: WorkspaceTier;
  status?: WorkspaceStatus;
}
export interface CreateProjectRequest {
  workspaceId: number;
  name: string;
  description?: string;
}
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}
export interface CreateTaskRequest {
  workspaceId: number;
  projectId?: number;
  title: string;
  description?: string;
  priority?: TaskPriority;
}
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string;
}
export interface SendMessageRequest {
  conversationId: number;
  workspaceId: number;
  content: string;
}
export interface InviteMemberRequest {
  email: string;
  role?: MemberRole;
}

export { studioContent } from "./content";
