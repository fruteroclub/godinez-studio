/**
 * Onboarding V3: Modular Soul Template System
 * 
 * This file orchestrates SOUL.md generation with fallback to legacy template.
 * Templates are loaded from soul-templates/ directory when available.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Re-export buildSoulMd from legacy for fallback
import { buildSoulMd as buildLegacySoulMd } from "./agent-soul-legacy";

const TEMPLATES_DIR = join(__dirname, "soul-templates");

export interface SoulContext {
  workspaceName: string;
  agentName: string;
  agentSlot: string;
  userName?: string;
  userRole?: string;
  businessDescription?: string;
  personality?: string;
  needs?: string[];
  projectType?: string;
  projectSubtype?: string;
  customInstructions?: string;
}

// Human-readable labels for project types
const PROJECT_TYPE_LABELS: Record<string, string> = {
  educacion: "estudiante/aprendiz",
  profesional: "profesional de negocios",
  personal: "usuario con proyecto personal",
};

// Human-readable labels for project subtypes
const PROJECT_SUBTYPE_LABELS: Record<string, string> = {
  // educacion
  bootcamp: "estudiante de bootcamp",
  aprender: "aprendiz autodidacta",
  // personal
  hackathon: "participante de hackathon",
  emprendimiento: "emprendedor",
  proyecto: "desarrollador de proyecto personal",
  // profesional
  crear_contenido: "creador de contenido",
  automatizar: "especialista en automatización",
  construir: "constructor/desarrollador",
  investigar: "investigador/analista",
  vender: "profesional de ventas",
  organizar: "gestor/organizador",
};

function templateExists(path: string): boolean {
  try {
    return existsSync(join(TEMPLATES_DIR, path));
  } catch {
    return false;
  }
}

function loadTemplate(path: string): string {
  return readFileSync(join(TEMPLATES_DIR, path), "utf-8");
}

function replaceVariables(template: string, ctx: SoulContext): string {
  return template
    .replace(/\{\{agentName\}\}/g, ctx.agentName)
    .replace(/\{\{userName\}\}/g, ctx.userName || "usuario")
    .replace(/\{\{workspaceName\}\}/g, ctx.workspaceName)
    .replace(/\{\{userRole\}\}/g, ctx.userRole || "")
    .replace(/\{\{businessDescription\}\}/g, ctx.businessDescription || "")
    .replace(/\{\{projectType\}\}/g, ctx.projectType || "")
    .replace(/\{\{projectSubtype\}\}/g, ctx.projectSubtype || "")
    .replace(/\{\{projectTypeLabel\}\}/g, PROJECT_TYPE_LABELS[ctx.projectType || ""] || "")
    .replace(/\{\{projectSubtypeLabel\}\}/g, PROJECT_SUBTYPE_LABELS[ctx.projectSubtype || ""] || "");
}

/**
 * Build SOUL.md for an agent.
 * 
 * Strategy:
 * 1. If projectType + projectSubtype are set, look for specific template
 * 2. If specific template exists, use base.md + specific template
 * 3. If no specific template, fall back to legacy buildSoulMd
 * 
 * This allows gradual migration: start with empty soul-templates/ folder,
 * and the system uses legacy. As templates are created, they take over.
 */
export function buildSoulMd(ctx: SoulContext): string {
  // If we have project context, try to find specific template
  if (ctx.projectType && ctx.projectSubtype) {
    const specificPath = `${ctx.projectType}/${ctx.projectSubtype}.md`;
    
    if (templateExists(specificPath)) {
      let soul = "";
      
      // Load base template if exists (common instructions for all users)
      if (templateExists("base.md")) {
        soul += loadTemplate("base.md") + "\n\n";
      }
      
      // Load type-specific base if exists (e.g., profesional/base.md)
      const typeBasePath = `${ctx.projectType}/base.md`;
      if (templateExists(typeBasePath)) {
        soul += loadTemplate(typeBasePath) + "\n\n";
      }
      
      // Load specific subtype template
      soul += loadTemplate(specificPath);
      
      // Replace template variables
      return replaceVariables(soul, ctx);
    }
  }
  
  // Fallback: use legacy template builder (the one that already works)
  // This ensures zero breaking changes for existing users
  return buildLegacySoulMd(ctx);
}

// Re-export for backwards compatibility
export { buildLegacySoulMd };
