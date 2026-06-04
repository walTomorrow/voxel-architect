import { describe, expect, it } from "vitest";
import { classifyRefinementPrompt } from "@/src/lib/builder/classifyRefinementPrompt";

describe("classifyRefinementPrompt", () => {
  it("classifies literal mechanical prompts", () => {
    expect(classifyRefinementPrompt("make it taller")).toBe("literal");
    expect(classifyRefinementPrompt("make the porch deeper")).toBe("literal");
    expect(classifyRefinementPrompt("extend the porch")).toBe("literal");
    expect(classifyRefinementPrompt("make the roof oak")).toBe("literal");
  });

  it("classifies semantic stylistic prompts", () => {
    expect(classifyRefinementPrompt("make it less squat")).toBe("semantic");
    expect(classifyRefinementPrompt("make it more rustic")).toBe("semantic");
    expect(classifyRefinementPrompt("make the roof dominate the silhouette")).toBe("semantic");
    expect(classifyRefinementPrompt("make it brighter")).toBe("semantic");
    expect(classifyRefinementPrompt("make the workshop sturdier")).toBe("semantic");
  });

  it("prefers semantic when combined with literal dimension language", () => {
    expect(classifyRefinementPrompt("make it taller and sturdier")).toBe("semantic");
  });

  it("classifies structural unsupported prompts", () => {
    expect(classifyRefinementPrompt("add a second floor")).toBe("structural");
    expect(classifyRefinementPrompt("add a side room")).toBe("structural");
    expect(classifyRefinementPrompt("add a balcony")).toBe("structural");
  });

  it("classifies component add/remove as literal", () => {
    expect(classifyRefinementPrompt("add a porch")).toBe("literal");
    expect(classifyRefinementPrompt("remove the porch")).toBe("literal");
    expect(classifyRefinementPrompt("make the porch wider")).toBe("literal");
    expect(classifyRefinementPrompt("add a chimney")).toBe("literal");
  });
});
