import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import {
  getSemanticBuildSummaryForPlanner,
  renderSemanticBuildSummaryText,
} from "@/src/lib/builder/semantic/getSemanticBuildSummaryForPlanner";
import { getMaterialStyleTags } from "@/src/lib/builder/semantic/materialStyleDescriptors";

describe("materialStyleDescriptors", () => {
  it("maps known preset materials to style tags", () => {
    expect(getMaterialStyleTags("limestone_bricks")).toContain("refined");
    expect(getMaterialStyleTags("cobblestone")).toContain("rustic");
    expect(getMaterialStyleTags("slate_tiles")).toContain("medieval");
    expect(getMaterialStyleTags("unknown_material_xyz")).toContain("neutral");
  });
});

describe("getSemanticBuildSummaryForPlanner — stone_workshop_v2", () => {
  const summary = getSemanticBuildSummaryForPlanner(
    clonePresetBlueprintV2("stone_workshop_v2"),
    { presetId: "stone_workshop_v2" },
  );

  it("identifies building type and stone-heavy style", () => {
    expect(summary.buildingType).toBe("stone workshop");
    expect(summary.styleDescriptors).toEqual(
      expect.arrayContaining(["refined", "rustic"]),
    );
    expect(summary.materialSummary).toContain("limestone_bricks");
    expect(summary.materialSummary).toContain("slate_tiles");
  });

  it("notes missing porch and chimney", () => {
    expect(summary.missingFeatures).toContain("porch");
    expect(summary.missingFeatures).toContain("chimney");
    expect(summary.featureSummary.some((f) => f.includes("no porch"))).toBe(true);
    expect(summary.featureSummary.some((f) => f.includes("no chimney"))).toBe(true);
  });

  it("describes front and left window groups", () => {
    const front = summary.windowsBySurface.find((w) => w.face === "front");
    const left = summary.windowsBySurface.find((w) => w.face === "left");
    expect(front?.groupId).toBe("front-windows");
    expect(front?.count).toBe(2);
    expect(left?.groupId).toBe("left-windows");
    expect(summary.windowsBySurface.find((w) => w.face === "right")?.groupId).toBeUndefined();
  });

  it("suggests chimney and side windows", () => {
    expect(summary.suggestedNextMoves.some((m) => m.includes("chimney"))).toBe(true);
    expect(summary.suggestedNextMoves.some((m) => m.includes("right"))).toBe(true);
  });

  it("renders readable text block", () => {
    const text = renderSemanticBuildSummaryText(summary);
    expect(text).toContain("Semantic build summary:");
    expect(text).toContain("stone workshop");
    expect(text).toContain("windows left:");
  });
});

describe("getSemanticBuildSummaryForPlanner — porch_house_v2", () => {
  const summary = getSemanticBuildSummaryForPlanner(
    clonePresetBlueprintV2("porch_house_v2"),
    { presetId: "porch_house_v2" },
  );

  it("identifies porch house with full facade porch", () => {
    expect(summary.buildingType).toBe("porch house");
    expect(summary.featureSummary.some((f) => f.includes("full_facade"))).toBe(true);
    expect(summary.missingFeatures).not.toContain("porch");
    expect(summary.missingFeatures).toContain("chimney");
  });

  it("does not suggest widen porch when already full_facade", () => {
    expect(summary.suggestedNextMoves.some((m) => m.includes("widen porch"))).toBe(false);
  });

  it("renders porch and front windows", () => {
    const text = renderSemanticBuildSummaryText(summary);
    expect(text).toContain("porch house");
    expect(text).toContain("windows front:");
    expect(text).toContain("front-windows");
  });
});
