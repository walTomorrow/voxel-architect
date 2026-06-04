import { describe, expect, it } from "vitest";
import { shouldRunGenerationTool } from "@/src/lib/builder/shouldRunGenerationTool";

describe("shouldRunGenerationTool", () => {
  it("returns false for empty text", () => {
    expect(shouldRunGenerationTool("", false)).toBe(false);
  });

  it("returns true when generation verbs are present", () => {
    expect(shouldRunGenerationTool("Make me a small stone cottage", false)).toBe(
      true,
    );
    expect(shouldRunGenerationTool("build a cabin", false)).toBe(true);
  });

  it("returns false for casual chat without build verbs", () => {
    expect(shouldRunGenerationTool("What materials look good for stone?", false)).toBe(
      false,
    );
  });

  it("returns false for image-only prompts", () => {
    expect(
      shouldRunGenerationTool(
        "Please interpret this reference image for building intent.",
        true,
      ),
    ).toBe(false);
  });

  it("returns true when image and text include generation verbs", () => {
    expect(
      shouldRunGenerationTool("Make me a cottage like this image", true),
    ).toBe(true);
  });
});
