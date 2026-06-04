import { describe, expect, it } from "vitest";
import {
  shouldRunRefinementTool,
  shouldStrongCreatePrompt,
} from "@/src/lib/builder/shouldRunRefinementTool";

describe("shouldStrongCreatePrompt", () => {
  it("matches strong create phrases with building nouns", () => {
    expect(shouldStrongCreatePrompt("make me a workshop")).toBe(true);
    expect(shouldStrongCreatePrompt("build me a cottage")).toBe(true);
  });

  it("does not match weak create phrasing", () => {
    expect(shouldStrongCreatePrompt("make a cottage")).toBe(false);
  });
});

describe("shouldRunRefinementTool", () => {
  it("requires an active blueprint", () => {
    expect(shouldRunRefinementTool("make it taller", false, false)).toBe(false);
  });

  it("runs for refinement verbs when a blueprint exists", () => {
    expect(shouldRunRefinementTool("make it taller", true, false)).toBe(true);
    expect(shouldRunRefinementTool("dark wood roof", true, false)).toBe(true);
  });

  it("defers to generate for strong create prompts", () => {
    expect(shouldRunRefinementTool("make me a workshop", true, false)).toBe(false);
  });

  it("rejects wider porch phrasing via refinement gate (maps to unsupported later)", () => {
    expect(shouldRunRefinementTool("make the porch wider", true, false)).toBe(true);
  });

  it("requires refinement verbs when an image is attached", () => {
    expect(shouldRunRefinementTool("what do you think?", true, true)).toBe(false);
    expect(shouldRunRefinementTool("make it taller", true, true)).toBe(true);
  });
});
