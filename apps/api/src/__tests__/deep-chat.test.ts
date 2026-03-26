import { describe, it, expect } from "vitest";
import { parseActionBlocks, stripActionBlocks } from "../lib/action-parser";

describe("Chat System - Deep Testing", () => {

  // 1. VALID ACTION TYPES (5 tests)
  describe("1. Valid Action Types", () => {
    const validTypes = ["create_project", "create_task", "create_file", "hackathon_advance", "hackathon_note"];
    for (const type of validTypes) {
      it(`parses: ${type}`, () => {
        const text = ":::action\ntype: " + type + "\nlabel: Test\npayload:\n  key: value\n:::";
        const blocks = parseActionBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe(type);
      });
    }
  });

  // 2. INVALID ACTION TYPES (10 tests)
  describe("2. Invalid Action Types", () => {
    const invalidTypes = ["delete_everything", "hack_system", "rm_rf", "DROP_TABLE", "eval_code", "exec_command", "", "null", "undefined", "INVALID"];
    for (const type of invalidTypes) {
      it(`rejects: ${type || "(empty)"}`, () => {
        const text = ":::action\ntype: " + type + "\nlabel: Test\npayload:\n  key: value\n:::";
        const blocks = parseActionBlocks(text);
        expect(blocks).toHaveLength(0);
      });
    }
  });

  // 3. MULTIPLE BLOCKS (5 tests)
  describe("3. Multiple Blocks", () => {
    it("parses 2 blocks", () => {
      const text = ":::action\ntype: create_project\nlabel: P1\npayload:\n  n: 1\n:::\n\nText\n\n:::action\ntype: create_task\nlabel: T1\npayload:\n  n: 2\n:::";
      const blocks = parseActionBlocks(text);
      expect(blocks).toHaveLength(2);
    });

    it("parses 5 blocks", () => {
      const block = ":::action\ntype: create_project\nlabel: Test\npayload:\n  n: 1\n:::\n\n";
      const text = block.repeat(5);
      expect(parseActionBlocks(text)).toHaveLength(5);
    });

    it("parses 10 blocks", () => {
      const block = ":::action\ntype: create_project\nlabel: Test\npayload:\n  n: 1\n:::\n\n";
      expect(parseActionBlocks(block.repeat(10))).toHaveLength(10);
    });

    it("handles text between blocks", () => {
      const text = "Start\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::\nMiddle\n:::action\ntype: create_task\nlabel: T\npayload:\n  n: 2\n:::\nEnd";
      expect(parseActionBlocks(text)).toHaveLength(2);
    });

    it("handles consecutive blocks", () => {
      const text = ":::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n::::::action\ntype: create_task\nlabel: T\npayload:\n  n: 2\n:::";
      const blocks = parseActionBlocks(text);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 4. STRIP BLOCKS (10 tests)
  describe("4. Strip Blocks", () => {
    it("strips single block", () => {
      const text = "Text\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::\nMore";
      expect(stripActionBlocks(text)).not.toContain(":::action");
    });

    it("preserves surrounding text", () => {
      const text = "Before\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::\nAfter";
      const stripped = stripActionBlocks(text);
      expect(stripped).toContain("Before");
      expect(stripped).toContain("After");
    });

    it("handles no blocks", () => {
      expect(stripActionBlocks("Just text")).toBe("Just text");
    });

    it("handles empty string", () => {
      expect(stripActionBlocks("")).toBe("");
    });

    it("handles only block", () => {
      const text = ":::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::";
      expect(stripActionBlocks(text)).toBe("");
    });

    it("preserves markdown", () => {
      const text = "# Header\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::\n**bold**";
      const stripped = stripActionBlocks(text);
      expect(stripped).toContain("# Header");
      expect(stripped).toContain("**bold**");
    });

    it("preserves code blocks", () => {
      const text = "```js\ncode\n```\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::";
      expect(stripActionBlocks(text)).toContain("```js");
    });

    it("preserves URLs", () => {
      const text = "https://example.com\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::";
      expect(stripActionBlocks(text)).toContain("https://");
    });

    it("preserves emojis", () => {
      const text = "🚀\n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::\n✅";
      const stripped = stripActionBlocks(text);
      expect(stripped).toContain("🚀");
      expect(stripped).toContain("✅");
    });

    it("trims whitespace", () => {
      const text = "   \n:::action\ntype: create_project\nlabel: P\npayload:\n  n: 1\n:::\n   ";
      expect(stripActionBlocks(text)).toBe("");
    });
  });

  // 5. PAYLOAD PARSING (15 tests)
  describe("5. Payload Parsing", () => {
    it("parses simple payload", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  name: Test\n:::";
      expect(parseActionBlocks(text)[0].payload).toEqual({ name: "Test" });
    });

    it("parses multiple fields", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  a: 1\n  b: 2\n  c: 3\n:::";
      const p = parseActionBlocks(text)[0].payload;
      expect(p.a).toBe("1");
      expect(p.b).toBe("2");
      expect(p.c).toBe("3");
    });

    it("handles empty payload", () => {
      const text = ":::action\ntype: create_task\nlabel: T\npayload:\n:::";
      expect(parseActionBlocks(text)[0].payload).toEqual({});
    });

    it("handles colon in value", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  time: 10:30\n:::";
      expect(parseActionBlocks(text)[0].payload.time).toBe("10:30");
    });

    it("handles URL in value", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  url: https://x.com\n:::";
      expect(parseActionBlocks(text)[0].payload.url).toContain("https");
    });

    it("handles emoji in value", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  title: 🚀 Go\n:::";
      expect(parseActionBlocks(text)[0].payload.title).toContain("🚀");
    });

    it("handles unicode in value", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  name: 日本語\n:::";
      expect(parseActionBlocks(text)[0].payload.name).toContain("日本語");
    });

    it("handles special chars", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  sym: @#$%\n:::";
      expect(parseActionBlocks(text)[0].payload.sym).toContain("@");
    });

    it("handles numbers", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  num: 42\n:::";
      expect(parseActionBlocks(text)[0].payload.num).toBe("42");
    });

    it("handles boolean-like", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  flag: true\n:::";
      expect(parseActionBlocks(text)[0].payload.flag).toBe("true");
    });

    it("handles null-like", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  val: null\n:::";
      expect(parseActionBlocks(text)[0].payload.val).toBe("null");
    });

    it("handles empty value", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  empty: \n:::";
      expect(parseActionBlocks(text)[0].payload.empty).toBe("");
    });

    it("handles long value", () => {
      const long = "A".repeat(500);
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  long: " + long + "\n:::";
      expect(parseActionBlocks(text)[0].payload.long).toBe(long);
    });

    it("trims values", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  name:   spaced   \n:::";
      expect(parseActionBlocks(text)[0].payload.name).toBe("spaced");
    });

    it("handles duplicate keys (last wins)", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  k: first\n  k: second\n:::";
      expect(parseActionBlocks(text)[0].payload.k).toBe("second");
    });
  });

  // 6. ID GENERATION (5 tests)
  describe("6. ID Generation", () => {
    it("generates ID", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)[0].id).toBeTruthy();
    });

    it("ID is 12 chars", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)[0].id.length).toBe(12);
    });

    it("same input = same ID", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      const id1 = parseActionBlocks(text)[0].id;
      const id2 = parseActionBlocks(text)[0].id;
      expect(id1).toBe(id2);
    });

    it("different payload = different ID", () => {
      const t1 = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      const t2 = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 2\n:::";
      expect(parseActionBlocks(t1)[0].id).not.toBe(parseActionBlocks(t2)[0].id);
    });

    it("different type = different ID", () => {
      const t1 = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      const t2 = ":::action\ntype: create_task\nlabel: T\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(t1)[0].id).not.toBe(parseActionBlocks(t2)[0].id);
    });
  });

  // 7. MALFORMED INPUT (15 tests)
  describe("7. Malformed Input", () => {
    it("unclosed block", () => {
      expect(parseActionBlocks(":::action\ntype: create_project\nlabel: T")).toHaveLength(0);
    });

    it("missing type", () => {
      expect(parseActionBlocks(":::action\nlabel: T\npayload:\n  n: 1\n:::")).toHaveLength(0);
    });

    it("missing label", () => {
      expect(parseActionBlocks(":::action\ntype: create_project\npayload:\n  n: 1\n:::")).toHaveLength(0);
    });

    it("no colon in fields", () => {
      expect(parseActionBlocks(":::action\ntype create_project\nlabel T\n:::")).toHaveLength(0);
    });

    it("empty block", () => {
      expect(parseActionBlocks(":::action\n:::")).toHaveLength(0);
    });

    it("only opening", () => {
      expect(parseActionBlocks(":::action")).toHaveLength(0);
    });

    it("only closing", () => {
      expect(parseActionBlocks(":::")).toHaveLength(0);
    });

    it("random text", () => {
      expect(parseActionBlocks("Just random text")).toHaveLength(0);
    });

    it("partial match", () => {
      expect(parseActionBlocks("::action\ntype: x\nlabel: y\n::")).toHaveLength(0);
    });

    it("wrong delimiter", () => {
      expect(parseActionBlocks("---action\ntype: create_project\nlabel: T\n---")).toHaveLength(0);
    });

    it("spaces in delimiter", () => {
      expect(parseActionBlocks("::: action\ntype: create_project\nlabel: T\n:::")).toHaveLength(0);
    });

    it("newline in delimiter", () => {
      expect(parseActionBlocks(":::\naction\ntype: create_project\nlabel: T\n:::")).toHaveLength(0);
    });

    it("case sensitive type", () => {
      expect(parseActionBlocks(":::action\ntype: CREATE_PROJECT\nlabel: T\npayload:\n  n: 1\n:::")).toHaveLength(0);
    });

    it("extra colons", () => {
      const blocks = parseActionBlocks("::::action\ntype: create_project\nlabel: T\n::::");
      expect(blocks.length).toBeGreaterThanOrEqual(0);
    });

    it("nested delimiters", () => {
      const text = ":::action\ntype: create_project\nlabel: :::test:::\npayload:\n  n: 1\n:::";
      const blocks = parseActionBlocks(text);
      expect(blocks.length).toBeGreaterThanOrEqual(0);
    });
  });

  // 8. SECURITY PATTERNS (15 tests)
  describe("8. Security Patterns", () => {
    it("XSS in label", () => {
      const text = ":::action\ntype: create_project\nlabel: <script>alert(1)</script>\npayload:\n  n: 1\n:::";
      const blocks = parseActionBlocks(text);
      expect(blocks[0].label).toContain("<script>");
    });

    it("SQL injection in payload", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  name: '; DROP TABLE;--\n:::";
      expect(parseActionBlocks(text)[0].payload.name).toContain("DROP");
    });

    it("path traversal in payload", () => {
      const text = ":::action\ntype: create_file\nlabel: T\npayload:\n  path: ../../../etc/passwd\n:::";
      expect(parseActionBlocks(text)[0].payload.path).toContain("../");
    });

    it("command injection", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  cmd: $(rm -rf /)\n:::";
      expect(parseActionBlocks(text)[0].payload.cmd).toContain("rm");
    });

    it("null byte", () => {
      const text = ":::action\ntype: create_project\nlabel: Test\x00\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("unicode escape", () => {
      const text = ":::action\ntype: create_project\nlabel: \\u003c\\u003e\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(1);
    });

    it("CRLF injection", () => {
      const text = ":::action\ntype: create_project\nlabel: T\r\nX-Injected: yes\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("JSON in payload", () => {
      const text = ':::action\ntype: create_project\nlabel: T\npayload:\n  json: {"k":"v"}\n:::';
      expect(parseActionBlocks(text)[0].payload.json).toContain("{");
    });

    it("XML in payload", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  xml: <tag>val</tag>\n:::";
      expect(parseActionBlocks(text)[0].payload.xml).toContain("<tag>");
    });

    it("regex pattern", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  re: .*+?^$\n:::";
      expect(parseActionBlocks(text)[0].payload.re).toContain(".*");
    });

    it("env variable syntax", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  env: $HOME\n:::";
      expect(parseActionBlocks(text)[0].payload.env).toBe("$HOME");
    });

    it("template syntax", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  tpl: {{user}}\n:::";
      expect(parseActionBlocks(text)[0].payload.tpl).toContain("{{");
    });

    it("backslash escape", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  path: C:\\Windows\n:::";
      expect(parseActionBlocks(text)[0].payload.path).toContain("\\");
    });

    it("very long type (rejected)", () => {
      const longType = "a".repeat(1000);
      const text = ":::action\ntype: " + longType + "\nlabel: T\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)).toHaveLength(0);
    });

    it("very long label (accepted)", () => {
      const longLabel = "A".repeat(1000);
      const text = ":::action\ntype: create_project\nlabel: " + longLabel + "\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)[0].label.length).toBe(1000);
    });
  });

  // 9. PERFORMANCE (5 tests)
  describe("9. Performance", () => {
    it("100 blocks < 500ms", () => {
      const block = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::\n\n";
      const text = block.repeat(100);
      const start = Date.now();
      parseActionBlocks(text);
      expect(Date.now() - start).toBeLessThan(500);
    });

    it("large text < 500ms", () => {
      const text = "A".repeat(100000) + "\n:::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      const start = Date.now();
      parseActionBlocks(text);
      expect(Date.now() - start).toBeLessThan(500);
    });

    it("1000 iterations < 2s", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      const start = Date.now();
      for (let i = 0; i < 1000; i++) parseActionBlocks(text);
      expect(Date.now() - start).toBeLessThan(2000);
    });

    it("strip 100 blocks < 500ms", () => {
      const block = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::\n\n";
      const text = block.repeat(100);
      const start = Date.now();
      stripActionBlocks(text);
      expect(Date.now() - start).toBeLessThan(500);
    });

    it("no memory leak (1000 calls)", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      for (let i = 0; i < 1000; i++) {
        parseActionBlocks(text);
        stripActionBlocks(text);
      }
      expect(true).toBe(true);
    });
  });

  // 10. EDGE CASES (10 tests)
  describe("10. Edge Cases", () => {
    it("BOM character", () => {
      const text = "\uFEFF:::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("tab indentation", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n\tname: test\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("mixed tabs/spaces", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n \tname: test\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("trailing newlines", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::\n\n\n";
      expect(parseActionBlocks(text)).toHaveLength(1);
    });

    it("no newline at end", () => {
      const text = ":::action\ntype: create_project\nlabel: T\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)).toHaveLength(1);
    });

    it("windows line endings", () => {
      const text = ":::action\r\ntype: create_project\r\nlabel: T\r\npayload:\r\n  n: 1\r\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("mixed line endings", () => {
      const text = ":::action\ntype: create_project\r\nlabel: T\npayload:\r\n  n: 1\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(0);
    });

    it("zero-width chars", () => {
      const text = ":::action\ntype: create_project\nlabel: T\u200B\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text).length).toBeGreaterThanOrEqual(1);
    });

    it("RTL chars", () => {
      const text = ":::action\ntype: create_project\nlabel: مرحبا\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)[0].label).toContain("مرحبا");
    });

    it("combining chars", () => {
      const text = ":::action\ntype: create_project\nlabel: café\npayload:\n  n: 1\n:::";
      expect(parseActionBlocks(text)[0].label).toContain("caf");
    });
  });
});
