import { describe, expect, it } from "vitest";
import {
  looksLikeDesignFeedback,
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
    expect(shouldStrongCreatePrompt("give it a gabled roof")).toBe(false);
  });
});

describe("looksLikeDesignFeedback", () => {
  it("matches design opinion questions", () => {
    expect(looksLikeDesignFeedback("what do you think of this design?")).toBe(true);
    expect(looksLikeDesignFeedback("how does this look")).toBe(true);
  });

  it("does not match edit requests", () => {
    expect(looksLikeDesignFeedback("give it a gabled roof")).toBe(false);
    expect(looksLikeDesignFeedback("make it taller")).toBe(false);
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

  it("routes give-it roof edits to refine", () => {
    expect(shouldRunRefinementTool("give it a gabled roof", true, false)).toBe(true);
  });

  it("defers to generate for strong create prompts", () => {
    expect(shouldRunRefinementTool("make me a workshop", true, false)).toBe(false);
    expect(shouldRunRefinementTool("give me a workshop", true, false)).toBe(false);
  });

  it("rejects wider porch phrasing via refinement gate (maps to unsupported later)", () => {
    expect(shouldRunRefinementTool("make the porch wider", true, false)).toBe(true);
  });

  it("allows natural-language edit requests", () => {
    expect(shouldRunRefinementTool("make it more rustic", true, false)).toBe(true);
    expect(shouldRunRefinementTool("make the roof into wood", true, false)).toBe(true);
  });

  it("skips tool for design feedback", () => {
    expect(shouldRunRefinementTool("what do you think of this design?", true, false)).toBe(
      false,
    );
    expect(shouldRunRefinementTool("what do you think of the build?", true, false)).toBe(false);
  });

  it("does not trigger on casual chat", () => {
    expect(shouldRunRefinementTool("thanks", true, false)).toBe(false);
    expect(shouldRunRefinementTool("hello", true, false)).toBe(false);
    expect(shouldRunRefinementTool("what do you think?", true, false)).toBe(false);
  });

  it("requires refinement verbs when an image is attached without edit intent", () => {
    expect(shouldRunRefinementTool("what do you think?", true, true)).toBe(false);
    expect(shouldRunRefinementTool("make it taller", true, true)).toBe(true);
  });
});
