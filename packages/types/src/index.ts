export type ProjectStatus = "active" | "completed" | "archived";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type TeamRole = "owner" | "admin" | "member" | "viewer";

export type WaitlistTier = "becario" | "asistente" | "agente";

export type Industry =
  | "finanzas"
  | "salud"
  | "ventas"
  | "founder"
  | "estudiante"
  | "remoto"
  | "freelancer"
  | "creativo"
  | "desarrollador"
  | "administracion";

export { studioContent } from "./content";
