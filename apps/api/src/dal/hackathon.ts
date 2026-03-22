/**
 * @fileoverview Hackathon Progress DAL - 9-phase workflow tracking
 * @module dal/hackathon
 */
import { logger } from "../lib/logger";
import { Errors } from "../lib/errors";
import { eq } from "drizzle-orm";
import { hackathonProgress, type HackathonPhase } from "@godinez/db";
import { db } from "../db";

// Initial phases template
const INITIAL_PHASES: HackathonPhase[] = [
  { number: 0, status: "pending", notes: [] },
  { number: 1, status: "pending", notes: [] },
  { number: 2, status: "pending", notes: [] },
  { number: 3, status: "pending", notes: [] },
  { number: 4, status: "pending", notes: [] },
  { number: 5, status: "pending", notes: [] },
  { number: 6, status: "pending", notes: [] },
  { number: 7, status: "pending", notes: [] },
  { number: 8, status: "pending", notes: [] },
];

// Limit notes per phase for scalability
const MAX_NOTES_PER_PHASE = 50;

// Get ALL hackathons for a workspace
export async function getHackathonsByWorkspace(workspaceId: number) {
  logger.debug({ workspaceId }, "Fetching hackathons for workspace");
  const hackathons = await db.query.hackathonProgress.findMany({
    where: eq(hackathonProgress.workspaceId, workspaceId),
    orderBy: (h, { desc }) => [desc(h.createdAt)],
  });
  logger.debug({ workspaceId, count: hackathons.length }, "Hackathons fetched");
  return hackathons;
}

// Get single hackathon by ID
export async function getHackathonById(hackathonId: number) {
  return db.query.hackathonProgress.findFirst({
    where: eq(hackathonProgress.id, hackathonId),
  });
}

// Legacy: Get first hackathon for workspace (for backward compat)
export async function getHackathonByWorkspace(workspaceId: number) {
  return db.query.hackathonProgress.findFirst({
    where: eq(hackathonProgress.workspaceId, workspaceId),
  });
}

// Create a NEW hackathon
export async function createHackathon(data: {
  workspaceId: number;
  name: string;
  deadline: Date;
  hackathonUrl?: string;
  resourcesUrl?: string;
}) {
  logger.info({ workspaceId: data.workspaceId, name: data.name, deadline: data.deadline }, "Creating hackathon");
  
  try {
    const [hackathon] = await db
      .insert(hackathonProgress)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        deadline: data.deadline,
        hackathonUrl: data.hackathonUrl,
        resourcesUrl: data.resourcesUrl,
        active: true,
        currentPhase: 0,
        phases: INITIAL_PHASES,
      })
      .returning();
    
    logger.info({ hackathonId: hackathon.id, workspaceId: data.workspaceId }, "Hackathon created successfully");
    return hackathon;
  } catch (error) {
    logger.error({ error, workspaceId: data.workspaceId, name: data.name }, "Failed to create hackathon");
    throw error;
  }
}

// Toggle active state by hackathon ID
export async function toggleHackathonActive(hackathonId: number) {
  const hackathon = await getHackathonById(hackathonId);
  if (!hackathon) {
    logger.warn({ hackathonId }, "Toggle failed: hackathon not found");
    throw Errors.hackathonNotFound(hackathonId);
  }
  
  const newState = !hackathon.active;
  logger.info({ hackathonId, active: newState }, "Toggling hackathon active state");
  
  const [updated] = await db
    .update(hackathonProgress)
    .set({
      active: newState,
      updatedAt: new Date(),
    })
    .where(eq(hackathonProgress.id, hackathonId))
    .returning();
  
  return updated;
}

// Update phase by hackathon ID
export async function updateHackathonPhase(
  hackathonId: number,
  phaseNumber: number,
  status: "done" | "current" | "pending",
  notes?: string[],
) {
  logger.info({ hackathonId, phaseNumber, status }, "Updating hackathon phase");
  
  const hackathon = await getHackathonById(hackathonId);
  if (!hackathon) {
    logger.warn({ hackathonId }, "Update phase failed: hackathon not found");
    throw Errors.hackathonNotFound(hackathonId);
  }
  
  const now = new Date().toISOString();
  const updatedPhases = hackathon.phases.map((phase) => {
    if (phase.number === phaseNumber) {
      return {
        ...phase,
        status,
        notes: notes ?? phase.notes,
        completedAt: status === "done" ? now : phase.completedAt,
      };
    }
    return phase;
  });
  
  // Calculate current phase
  let currentPhase = 0;
  for (const phase of updatedPhases) {
    if (phase.status === "current") {
      currentPhase = phase.number;
      break;
    }
    if (phase.status === "done") {
      currentPhase = phase.number + 1;
    }
  }
  
  try {
    const [updated] = await db
      .update(hackathonProgress)
      .set({
        phases: updatedPhases,
        currentPhase: Math.min(currentPhase, 8),
        updatedAt: new Date(),
      })
      .where(eq(hackathonProgress.id, hackathonId))
      .returning();
    
    logger.info({ hackathonId, phaseNumber, newCurrentPhase: updated.currentPhase }, "Phase updated successfully");
    return updated;
  } catch (error) {
    logger.error({ error, hackathonId, phaseNumber }, "Failed to update phase");
    throw error;
  }
}

// Add note by hackathon ID
export async function addHackathonNote(
  hackathonId: number,
  phaseNumber: number,
  note: string,
) {
  logger.info({ hackathonId, phaseNumber, noteLength: note.length }, "Adding note to hackathon");
  
  const hackathon = await getHackathonById(hackathonId);
  if (!hackathon) {
    logger.warn({ hackathonId }, "Add note failed: hackathon not found");
    throw Errors.hackathonNotFound(hackathonId);
  }
  
  // Check note limit for scalability
  const currentPhase = hackathon.phases.find(p => p.number === phaseNumber);
  if (currentPhase && currentPhase.notes.length >= MAX_NOTES_PER_PHASE) {
    logger.warn({ hackathonId, phaseNumber, currentNotes: currentPhase.notes.length }, "Note limit reached");
    throw Errors.hackathonNoteLimitReached(phaseNumber, MAX_NOTES_PER_PHASE);
  }
  
  // Deduplicate: skip if the exact note already exists in this phase
  if (currentPhase && currentPhase.notes.includes(note)) {
    logger.info({ hackathonId, phaseNumber }, "Duplicate note skipped");
    return hackathon;
  }

  const updatedPhases = hackathon.phases.map((phase) => {
    if (phase.number === phaseNumber) {
      return {
        ...phase,
        notes: [...phase.notes, note],
      };
    }
    return phase;
  });

  try {
    const [updated] = await db
      .update(hackathonProgress)
      .set({
        phases: updatedPhases,
        updatedAt: new Date(),
      })
      .where(eq(hackathonProgress.id, hackathonId))
      .returning();
    
    const newNotesCount = updated.phases.find(p => p.number === phaseNumber)?.notes.length ?? 0;
    logger.info({ hackathonId, phaseNumber, totalNotes: newNotesCount }, "Note added successfully");
    return updated;
  } catch (error) {
    logger.error({ error, hackathonId, phaseNumber }, "Failed to add note");
    throw error;
  }
}

// Delete hackathon by ID
export async function deleteHackathon(hackathonId: number) {
  logger.info({ hackathonId }, "Deleting hackathon");
  
  try {
    await db
      .delete(hackathonProgress)
      .where(eq(hackathonProgress.id, hackathonId));
    
    logger.info({ hackathonId }, "Hackathon deleted successfully");
    return { success: true };
  } catch (error) {
    logger.error({ error, hackathonId }, "Failed to delete hackathon");
    throw error;
  }
}
