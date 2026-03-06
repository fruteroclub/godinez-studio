import { describe, it, expect } from "vitest";
import { buildSoulMd } from "./agent-soul-template";

describe("buildSoulMd", () => {
  it("generates basic template with required fields", () => {
    const result = buildSoulMd({
      workspaceName: "Mi Empresa",
      agentName: "Luna",
      agentSlot: "godin-slot-1",
    });
    expect(result).toContain("# SOUL.md — Luna");
    expect(result).toContain('workspace **"Mi Empresa"**');
    expect(result).toContain(":::action");
    expect(result).toContain("create_project");
    expect(result).toContain("create_task");
    expect(result).toContain("create_file");
  });

  it("includes user context when provided", () => {
    const result = buildSoulMd({
      workspaceName: "Test",
      agentName: "Agent",
      agentSlot: "slot-1",
      userName: "Carlos",
      userRole: "founder",
      businessDescription: "Coffee shop chain",
    });
    expect(result).toContain("**Carlos**");
    expect(result).toContain("Fundador/CEO");
    expect(result).toContain("Coffee shop chain");
  });

  it("includes personality section", () => {
    const result = buildSoulMd({
      workspaceName: "Test",
      agentName: "Agent",
      agentSlot: "slot-1",
      personality: "creative",
    });
    expect(result).toContain("## Your personality");
    expect(result).toContain("propositivo y original");
  });

  it("includes needs section", () => {
    const result = buildSoulMd({
      workspaceName: "Test",
      agentName: "Agent",
      agentSlot: "slot-1",
      userName: "Ana",
      needs: ["launch", "social"],
    });
    expect(result).toContain("Lanzar productos rápido");
    expect(result).toContain("Crecer en redes sociales");
  });

  it("includes custom instructions", () => {
    const result = buildSoulMd({
      workspaceName: "Test",
      agentName: "Agent",
      agentSlot: "slot-1",
      customInstructions: "Always respond in formal Spanish.",
    });
    expect(result).toContain("## Custom instructions from your user");
    expect(result).toContain("Always respond in formal Spanish.");
  });

  it("snapshot: full template", () => {
    const result = buildSoulMd({
      workspaceName: "Frutero Club",
      agentName: "Coco",
      agentSlot: "godin-slot-3",
      userName: "Mel",
      userRole: "founder",
      businessDescription: "AI tools for LatAm SMBs",
      personality: "friendly",
      needs: ["launch", "build"],
      customInstructions: "Focus on product development.",
    });
    expect(result).toMatchSnapshot();
  });
});
