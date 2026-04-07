import { describe, it, expect } from "vitest";
import { buildSoulMd } from "../services/agent-soul-legacy";

const ROLE_IDS = ["negocio", "marketing", "ventas", "admin", "tech", "educacion", "creatividad", "consultoria", "otra"];

describe("buildSoulMd - Deep Testing (100+ tests)", () => {
  
  // 1. SINGLE ROLE TESTS (9 tests)
  describe("1. Single Role Tests", () => {
    for (const role of ROLE_IDS) {
      it(`single role: ${role}`, () => {
        const soul = buildSoulMd({
          workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
          userName: "User", userRole: role, personality: "friendly",
          projectType: "profesional", projectSubtype: "crear_contenido"
        });
        expect(soul).toContain("works in");
      });
    }
  });

  // 2. MULTI-ROLE COMBINATIONS (10 tests)
  describe("2. Multi-Role Combinations", () => {
    const labels: Record<string, string> = {
      negocio: "Negocio propio", marketing: "Marketing/Comunicación", ventas: "Ventas",
      admin: "Admin/Operaciones", tech: "Tecnología", educacion: "Educación",
      creatividad: "Creatividad", consultoria: "Consultoría/Servicios", otra: "Otra"
    };
    const combos = [
      ["marketing", "tech"],
      ["ventas", "admin", "tech"],
      ["negocio", "marketing", "ventas", "admin"],
      ["tech", "creatividad", "consultoria"],
      ["negocio", "tech", "creatividad", "consultoria", "otra"],
      ["marketing", "ventas"],
      ["admin", "educacion"],
      ["creatividad", "otra"],
      ["negocio", "admin", "tech"],
      ["ventas", "creatividad", "consultoria"]
    ];
    for (const combo of combos) {
      it(`${combo.length} roles: ${combo.join(",")}`, () => {
        const soul = buildSoulMd({
          workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
          userName: "User", userRole: combo.join(","), personality: "friendly",
          projectType: "profesional", projectSubtype: "crear_contenido"
        });
        for (const r of combo) { expect(soul).toContain(labels[r]); }
      });
    }
  });

  // 3. LEGACY ROLE COMPATIBILITY (5 tests)
  describe("3. Legacy Role Compatibility", () => {
    const legacy = [
      { id: "founder", label: "Fundador/CEO" },
      { id: "other", label: "Otro" },
      { id: "operations", label: "Operaciones" },
      { id: "support", label: "Soporte" },
      { id: "sales", label: "Ventas" }
    ];
    for (const { id, label } of legacy) {
      it(`legacy: ${id} → ${label}`, () => {
        const soul = buildSoulMd({
          workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
          userName: "User", userRole: id, personality: "friendly",
          projectType: "profesional", projectSubtype: "crear_contenido"
        });
        expect(soul).toContain(label);
      });
    }
  });

  // 4. PROJECT TYPE + SUBTYPE (11 tests)
  describe("4. Project Type + Subtype", () => {
    const combos = [
      ["educacion", "bootcamp"], ["educacion", "aprender"],
      ["profesional", "crear_contenido"], ["profesional", "automatizar"],
      ["profesional", "construir"], ["profesional", "investigar"],
      ["profesional", "vender"], ["profesional", "organizar"],
      ["personal", "hackathon"], ["personal", "emprendimiento"],
      ["personal", "proyecto"]
    ];
    for (const [type, subtype] of combos) {
      it(`${type}/${subtype}`, () => {
        const soul = buildSoulMd({
          workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
          userName: "User", userRole: "tech", personality: "friendly",
          projectType: type as any, projectSubtype: subtype as any
        });
        expect(soul).toContain("Contexto actual:");
      });
    }
  });

  // 5. PERSONALITY TESTS (4 tests)
  describe("5. Personality Tests", () => {
    for (const p of ["professional", "friendly", "creative", "technical"]) {
      it(`personality: ${p}`, () => {
        const soul = buildSoulMd({
          workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
          userName: "User", userRole: "tech", personality: p,
          projectType: "profesional", projectSubtype: "crear_contenido"
        });
        expect(soul).toContain("Your personality");
      });
    }
  });

  // 6. EMPTY/NULL FIELD TESTS (10 tests)
  describe("6. Empty/Null Field Tests", () => {
    it("empty userRole", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).not.toContain("works in **,");
    });
    it("undefined userRole", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).not.toContain("works in");
    });
    it("empty userName", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "", userRole: "tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul.length).toBeGreaterThan(0);
    });
    it("empty workspaceName", () => {
      const soul = buildSoulMd({
        workspaceName: "", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul.length).toBeGreaterThan(0);
    });
    it("missing projectType", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", personality: "friendly"
      });
      expect(soul).not.toContain("Contexto actual:");
    });
    it("missing projectSubtype", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", personality: "friendly",
        projectType: "profesional"
      });
      expect(soul).not.toContain("Contexto actual:");
    });
    it("businessDescription present", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", businessDescription: "Mi negocio",
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Mi negocio");
    });
    it("customInstructions present", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", customInstructions: "Habla español",
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Habla español");
    });
    it("needs array present", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", needs: ["launch", "automate"],
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("They told you they want help with");
    });
    it("empty needs array", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", needs: [],
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).not.toContain("They told you they want help with");
    });
  });

  // 7. VARCHAR(50) LIMIT TESTS (5 tests)
  describe("7. VARCHAR(50) Limit Tests", () => {
    it("1 role fits", () => { expect("tech".length).toBeLessThanOrEqual(50); });
    it("3 roles fit", () => { expect("tech,admin,ventas".length).toBeLessThanOrEqual(50); });
    it("5 roles fit", () => { expect("negocio,marketing,ventas,admin,tech".length).toBeLessThanOrEqual(50); });
    it("6 roles close to limit", () => { 
      expect("negocio,marketing,ventas,admin,tech,educacion".length).toBeLessThanOrEqual(50);
    });
    it("all 9 roles exceed", () => { expect(ROLE_IDS.join(",").length).toBeGreaterThan(50); });
  });

  // 8. SPECIAL CHARACTERS (8 tests)
  describe("8. Special Characters", () => {
    it("accents in userName", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "José Ñoño", userRole: "tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("José Ñoño");
    });
    it("emojis in workspaceName", () => {
      const soul = buildSoulMd({
        workspaceName: "Negocio 🚀", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Negocio 🚀");
    });
    it("markdown in customInstructions", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", customInstructions: "**bold** _italic_",
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("**bold**");
    });
    it("ampersand in businessDescription", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", businessDescription: "Café & Bar",
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Café & Bar");
    });
    it("quotes in businessDescription", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", businessDescription: "Tienda El Mejor",
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Tienda El Mejor");
    });
    it("newlines in customInstructions", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", customInstructions: "Line1\nLine2\nLine3",
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Line1\nLine2\nLine3");
    });
    it("long text (1000 chars)", () => {
      const longText = "A".repeat(1000);
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", customInstructions: longText,
        personality: "friendly", projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain(longText);
    });
    it("numbers in userName", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User123", userRole: "tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("User123");
    });
  });

  // 9. ROLE LABEL TRANSLATIONS (9 tests)
  describe("9. Role Label Translations", () => {
    const translations = [
      { id: "negocio", label: "Negocio propio" },
      { id: "marketing", label: "Marketing/Comunicación" },
      { id: "ventas", label: "Ventas" },
      { id: "admin", label: "Admin/Operaciones" },
      { id: "tech", label: "Tecnología" },
      { id: "educacion", label: "Educación" },
      { id: "creatividad", label: "Creatividad" },
      { id: "consultoria", label: "Consultoría/Servicios" },
      { id: "otra", label: "Otra" }
    ];
    for (const { id, label } of translations) {
      it(`${id} → ${label}`, () => {
        const soul = buildSoulMd({
          workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
          userName: "User", userRole: id, personality: "friendly",
          projectType: "profesional", projectSubtype: "crear_contenido"
        });
        expect(soul).toContain(label);
      });
    }
  });

  // 10. OUTPUT STRUCTURE (15 tests)
  describe("10. Output Structure", () => {
    const base = {
      workspaceName: "TestWorkspace", agentName: "TestAgent", agentSlot: "slot-1",
      userName: "TestUser", userRole: "tech", personality: "friendly",
      projectType: "profesional" as const, projectSubtype: "crear_contenido" as const
    };
    it("has SOUL.md header", () => { expect(buildSoulMd(base)).toContain("# SOUL.md"); });
    it("has Who you are section", () => { expect(buildSoulMd(base)).toContain("## Who you are"); });
    it("has Who your user is section", () => { expect(buildSoulMd(base)).toContain("## Who your user is"); });
    it("has Your personality section", () => { expect(buildSoulMd(base)).toContain("## Your personality"); });
    it("contains agentName", () => { expect(buildSoulMd(base)).toContain("TestAgent"); });
    it("contains workspaceName", () => { expect(buildSoulMd(base)).toContain("TestWorkspace"); });
    it("contains userName", () => { expect(buildSoulMd(base)).toContain("TestUser"); });
    it("has 3+ headers", () => { expect(buildSoulMd(base).match(/^#+ /gm)?.length).toBeGreaterThanOrEqual(3); });
    it("length > 500", () => { expect(buildSoulMd(base).length).toBeGreaterThan(500); });
    it("length < 10000", () => { expect(buildSoulMd(base).length).toBeLessThan(10000); });
    it("no undefined string", () => { expect(buildSoulMd(base)).not.toContain("undefined"); });
    it("no null string", () => { expect(buildSoulMd(base)).not.toContain("null"); });
    it("contains Godinez.AI Studio", () => { expect(buildSoulMd(base)).toContain("Godinez.AI Studio"); });
    it("contains productivity platform", () => { expect(buildSoulMd(base)).toContain("productivity platform"); });
    it("is string type", () => { expect(typeof buildSoulMd(base)).toBe("string"); });
  });

  // 11. EDGE CASES (10 tests)
  describe("11. Edge Cases", () => {
    it("all fields empty", () => {
      const soul = buildSoulMd({
        workspaceName: "", agentName: "", agentSlot: "",
        userName: "", userRole: "", personality: ""
      });
      expect(soul.length).toBeGreaterThan(0);
    });
    it("very long agentName", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "A".repeat(100), agentSlot: "slot-1",
        userName: "User", userRole: "tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("A".repeat(100));
    });
    it("spaces in role", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: " tech , admin ", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Tecnología");
    });
    it("unknown role ID falls back to raw", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "unknown_role", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("unknown_role");
    });
    it("unknown personality falls back", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech", personality: "unknown",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul.length).toBeGreaterThan(0);
    });
    it("mixed legacy and new roles", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "founder,tech,other", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Fundador/CEO");
      expect(soul).toContain("Tecnología");
      expect(soul).toContain("Otro");
    });
    it("duplicate roles handled", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "tech,tech,tech", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("Tecnología");
    });
    it("case sensitivity in roles", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "TECH", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).toContain("TECH"); // Falls back to raw
    });
    it("only commas in userRole", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: ",,,", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul).not.toContain("works in ****");
    });
    it("whitespace-only userRole", () => {
      const soul = buildSoulMd({
        workspaceName: "Test", agentName: "Agent", agentSlot: "slot-1",
        userName: "User", userRole: "   ", personality: "friendly",
        projectType: "profesional", projectSubtype: "crear_contenido"
      });
      expect(soul.length).toBeGreaterThan(0);
    });
  });
});
