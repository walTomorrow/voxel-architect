import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { PLANNER_EXAMPLES_BLOCK } from "@/src/lib/builder/buildPlannerPrompt";
import {
  buildPlannerContextForLlm,
  renderPlannerContextText,
} from "@/src/lib/builder/semantic/buildPlannerContextForLlm";

describe("buildPlannerContextForLlm", () => {
  const blueprint = clonePresetBlueprintV2("stone_workshop_v2");

  it("includes semantic summary and affordances for all requests", () => {
    const ctx = buildPlannerContextForLlm(blueprint, { presetId: "stone_workshop_v2" });
    expect(ctx.semanticSummary).toContain("Semantic build summary:");
    expect(ctx.affordances).toContain("window.front.increaseCount");
    expect(ctx.allowedOperations).toContain("Allowed operations");
    expect(ctx.aestheticRestraint).toBe("");
    expect(ctx.styleGuidance).toBe("");
  });

  it("adds restraint and filtered style guidance for style prompts", () => {
    const ctx = buildPlannerContextForLlm(blueprint, {
      presetId: "stone_workshop_v2",
      userRequest: "make it more welcoming and brighter",
    });
    expect(ctx.aestheticRestraint).toContain("Aesthetic restraint");
    expect(ctx.styleGuidance).toContain("welcoming");
    expect(ctx.styleGuidance).toContain("bright");
    expect(ctx.styleGuidance).toContain("filtered for this build");
  });

  it("renderPlannerContextText orders summary, affordances, ops, restraint, style", () => {
    const ctx = buildPlannerContextForLlm(blueprint, {
      presetId: "stone_workshop_v2",
      userRequest: "more rustic",
    });
    const text = renderPlannerContextText(ctx);
    const summaryIdx = text.indexOf("Semantic build summary:");
    const affordIdx = text.indexOf("Rich blueprint affordances:");
    const opsIdx = text.indexOf("Allowed operations");
    const restraintIdx = text.indexOf("Aesthetic restraint");
    const styleIdx = text.indexOf("Style intent guidance");
    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(affordIdx).toBeGreaterThan(summaryIdx);
    expect(opsIdx).toBeGreaterThan(affordIdx);
    expect(restraintIdx).toBeGreaterThan(opsIdx);
    expect(styleIdx).toBeGreaterThan(restraintIdx);
  });

  it("summary includes window crowding and already-present cues", () => {
    const porch = buildPlannerContextForLlm(clonePresetBlueprintV2("porch_house_v2"), {
      presetId: "porch_house_v2",
      userRequest: "more refined",
    });
    expect(porch.semanticSummary).toContain("window crowding:");
    expect(porch.semanticSummary).toContain("already present:");
    expect(porch.affordances).toContain("palette:");
    expect(porch.affordances).toContain("room:");
  });
});

describe("PLANNER_EXAMPLES_BLOCK", () => {
  it("welcoming example prefers porch and side window over front bump", () => {
    expect(PLANNER_EXAMPLES_BLOCK).toContain("main-room.right");
    expect(
      PLANNER_EXAMPLES_BLOCK.includes("front-windows") &&
        PLANNER_EXAMPLES_BLOCK.includes('"count":3'),
    ).toBe(false);
  });
});
