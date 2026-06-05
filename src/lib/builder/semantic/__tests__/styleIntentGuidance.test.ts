import { describe, expect, it } from "vitest";
import {
  detectStyleIntents,
  renderStyleIntentGuidanceForPlanner,
} from "@/src/lib/builder/semantic/styleIntentGuidance";

describe("detectStyleIntents", () => {
  it("detects welcoming", () => {
    expect(detectStyleIntents("make it more welcoming")).toEqual(["welcoming"]);
  });

  it("detects rustic and sturdy", () => {
    expect(detectStyleIntents("make it more rustic and sturdier")).toEqual(
      expect.arrayContaining(["rustic", "sturdy"]),
    );
  });

  it("detects bright medieval refined", () => {
    expect(detectStyleIntents("brighter and more medieval, refined look")).toEqual(
      expect.arrayContaining(["bright", "medieval", "refined"]),
    );
  });

  it("returns empty for literal dimension edit", () => {
    expect(detectStyleIntents("make it taller")).toEqual([]);
  });
});

describe("renderStyleIntentGuidanceForPlanner", () => {
  it("renders guidance for detected intents", () => {
    const text = renderStyleIntentGuidanceForPlanner(["welcoming", "bright"]);
    expect(text).toContain("welcoming");
    expect(text).toContain("front windows at capacity");
    expect(text).toContain("bright");
  });

  it("returns empty when no intents", () => {
    expect(renderStyleIntentGuidanceForPlanner([])).toBe("");
  });
});
