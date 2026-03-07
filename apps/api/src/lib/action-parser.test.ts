import { describe, it, expect } from "vitest";
import { parseActionBlocks, stripActionBlocks } from "./action-parser";

describe("parseActionBlocks", () => {
  it("parses a valid create_project action", () => {
    const text = `Here's a project:
:::action
type: create_project
label: Create project "My Project"
payload:
  name: My Project
  description: A test project
:::
Done!`;
    const blocks = parseActionBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("create_project");
    expect(blocks[0].label).toBe('Create project "My Project"');
    expect(blocks[0].payload).toEqual({
      name: "My Project",
      description: "A test project",
    });
    expect(blocks[0].id).toMatch(/^[a-f0-9]{12}$/);
  });

  it("parses multiple action blocks", () => {
    const text = `:::action
type: create_project
label: Project
payload:
  name: P1
:::
Some text
:::action
type: create_task
label: Task
payload:
  title: T1
  priority: high
:::`;
    const blocks = parseActionBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("create_project");
    expect(blocks[1].type).toBe("create_task");
    expect(blocks[1].payload).toEqual({ title: "T1", priority: "high" });
  });

  it("ignores blocks with invalid type", () => {
    const text = `:::action
type: delete_everything
label: Bad
payload:
  x: 1
:::`;
    const blocks = parseActionBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("ignores blocks without label", () => {
    const text = `:::action
type: create_project
payload:
  name: NoLabel
:::`;
    const blocks = parseActionBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("returns empty array for text with no action blocks", () => {
    expect(parseActionBlocks("Just regular text")).toEqual([]);
    expect(parseActionBlocks("")).toEqual([]);
  });

  it("generates deterministic IDs for same content", () => {
    const text = `:::action
type: create_task
label: Test
payload:
  title: Same
:::`;
    const a = parseActionBlocks(text);
    const b = parseActionBlocks(text);
    expect(a[0].id).toBe(b[0].id);
  });
});

describe("stripActionBlocks", () => {
  it("removes action blocks and trims", () => {
    const text = `Hello!
:::action
type: create_project
label: Proj
payload:
  name: P
:::
Goodbye.`;
    const stripped = stripActionBlocks(text);
    expect(stripped).toBe("Hello!\n\nGoodbye.");
  });

  it("returns original text when no action blocks", () => {
    expect(stripActionBlocks("No actions here")).toBe("No actions here");
  });
});
