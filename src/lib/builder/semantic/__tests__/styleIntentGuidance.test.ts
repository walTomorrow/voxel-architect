import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import { getBlueprintAffordancesForPlanner } from "@/src/lib/builder/getBlueprintAffordancesForPlanner";
import { getSemanticBuildSummaryForPlanner } from "@/src/lib/builder/semantic/getSemanticBuildSummaryForPlanner";
import { getRichBlueprintAffordancesForPlanner } from "@/src/lib/builder/semantic/richAffordances";
import {
  buildStyleGapHints,
  detectStyleIntents,
  filterStyleGuidanceForPlanner,
  renderAestheticRestraintForStylePrompt,
  renderStyleIntentGuidanceForPlanner,
} from "@/src/lib/builder/semantic/styleIntentGuidance";

function filterCtxFor(presetId: "stone_workshop_v2" | "porch_house_v2") {
  const blueprint = clonePresetBlueprintV2(presetId);
  return {
    summary: getSemanticBuildSummaryForPlanner(blueprint, { presetId }),
    rich: getRichBlueprintAffordancesForPlanner(blueprint),
  };
}

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

  it("skips bright intent for window-treatment-only phrasing", () => {
    expect(detectStyleIntents("make the windows brighter")).toEqual([]);
    expect(detectStyleIntents("brighter glass on the front")).toEqual([]);
  });

  it("still detects bright for whole-building requests", () => {
    expect(detectStyleIntents("make the whole building brighter")).toEqual(["bright"]);
  });
});

describe("filterStyleGuidanceForPlanner", () => {
  it("omits porch add when porch already present", () => {
    const ctx = filterCtxFor("porch_house_v2");
    const filtered = filterStyleGuidanceForPlanner(["welcoming"], ctx);
    const lines = filtered.welcoming ?? [];
    expect(lines.some((l) => l.includes("Add a front porch"))).toBe(false);
    expect(lines.some((l) => l.includes("Warm palette"))).toBe(true);
  });

  it("omits front capacity line when front not at capacity", () => {
    const ctx = filterCtxFor("stone_workshop_v2");
    const filtered = filterStyleGuidanceForPlanner(["welcoming"], ctx);
    const lines = filtered.welcoming ?? [];
    expect(lines.some((l) => l.includes("frontWindowsAtCapacity"))).toBe(false);
  });

  it("includes front capacity line when front is maxed", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const max = getBlueprintAffordancesForPlanner(bp).windows.find((w) => w.face === "front")!
      .maxSlots;
    const bumped = applyBlueprintOperationsV2(bp, [
      {
        op: "updateComponent",
        id: "front-windows",
        componentType: "window_group",
        patch: { type: "window_group", count: max },
      },
    ]);
    const ctx = {
      summary: getSemanticBuildSummaryForPlanner(bumped.blueprint!, {
        presetId: "stone_workshop_v2",
      }),
      rich: getRichBlueprintAffordancesForPlanner(bumped.blueprint!),
    };
    const filtered = filterStyleGuidanceForPlanner(["welcoming"], ctx);
    expect(filtered.welcoming?.some((l) => l.includes("frontWindowsAtCapacity"))).toBe(true);
  });

  it("bright guidance includes non-crowded window line when capacity exists", () => {
    const ctx = filterCtxFor("stone_workshop_v2");
    const filtered = filterStyleGuidanceForPlanner(["bright"], ctx);
    const lines = filtered.bright ?? [];
    expect(lines.some((l) => l.includes("non-crowded"))).toBe(true);
    expect(lines.some((l) => l.includes("Do not remove porch"))).toBe(true);
  });
});

describe("buildStyleGapHints", () => {
  it("returns at most two hints", () => {
    const summary = getSemanticBuildSummaryForPlanner(clonePresetBlueprintV2("stone_workshop_v2"), {
      presetId: "stone_workshop_v2",
    });
    const hints = buildStyleGapHints(["rustic", "refined", "bright", "medieval"], summary);
    expect(hints.length).toBeLessThanOrEqual(2);
  });

  it("skips gap hint when palette already carries both conflicting tags", () => {
    const summary = getSemanticBuildSummaryForPlanner(clonePresetBlueprintV2("stone_workshop_v2"), {
      presetId: "stone_workshop_v2",
    });
    expect(summary.styleDescriptors).toContain("refined");
    expect(summary.styleDescriptors).toContain("rustic");
    expect(buildStyleGapHints(["refined"], summary)).toEqual([]);
  });
});

describe("renderAestheticRestraintForStylePrompt", () => {
  it("renders restraint rules for style intents", () => {
    const text = renderAestheticRestraintForStylePrompt(["welcoming"]);
    expect(text).toContain("Aesthetic restraint");
    expect(text).toContain("1–3 tasteful operations");
    expect(text).toContain("room width/depth/height");
  });

  it("returns empty when no intents", () => {
    expect(renderAestheticRestraintForStylePrompt([])).toBe("");
  });
});

describe("renderStyleIntentGuidanceForPlanner", () => {
  it("renders filtered guidance when context provided", () => {
    const workshop = renderStyleIntentGuidanceForPlanner(
      ["welcoming", "bright"],
      filterCtxFor("stone_workshop_v2"),
    );
    expect(workshop).toContain("welcoming");
    expect(workshop).toContain("Add a front porch");

    const porchHouse = renderStyleIntentGuidanceForPlanner(
      ["welcoming"],
      filterCtxFor("porch_house_v2"),
    );
    expect(porchHouse).toContain("welcoming");
    expect(porchHouse).not.toContain("Add a front porch if absent");
  });

  it("renders unfiltered guidance without context", () => {
    const text = renderStyleIntentGuidanceForPlanner(["welcoming"]);
    expect(text).toContain("Add a front porch");
  });

  it("returns empty when no intents", () => {
    expect(renderStyleIntentGuidanceForPlanner([])).toBe("");
  });
});
