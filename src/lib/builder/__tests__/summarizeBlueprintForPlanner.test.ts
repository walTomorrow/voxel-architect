import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import {
  renderBlueprintSummaryText,
  summarizeBlueprintForPlanner,
} from "@/src/lib/builder/summarizeBlueprintForPlanner";

describe("summarizeBlueprintForPlanner", () => {
  it("includes all component ids for simple cabin", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const summary = summarizeBlueprintForPlanner(blueprint, { presetId: "simple_cabin_v2" });
    expect(summary.schemaVersion).toBe(2);
    expect(summary.presetSource).toBe("simple_cabin_v2");
    expect(summary.components.some((c) => c.id === "main-room")).toBe(true);
    expect(summary.components.some((c) => c.id === "front-windows")).toBe(true);
    const text = renderBlueprintSummaryText(summary);
    expect(text).toContain("main-room");
    expect(text).toContain("materials:");
  });
});
