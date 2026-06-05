import { describe, expect, it } from "vitest";
import { LANDMARK_TOWER_DEFAULT } from "@/src/lib/blueprints/sampleLandmarkTowerBlueprints";
import { isLandmarkTowerBlueprint } from "@/src/lib/blueprints/types/landmarkTower";
import { validateLandmarkTowerBlueprint } from "@/src/lib/blueprints/validateLandmarkTower";
import { generateLandmarkTower, landmarkTowerTotalHeight } from "@/src/lib/generation/generators/generateLandmarkTower";
import { generateBuildingPreview } from "@/src/lib/builder/generateBuildingPreview";
import { isLandmarkTowerRequest } from "@/src/lib/builder/reference/isLandmarkTowerRequest";
import { mapColorPaletteFromText } from "@/src/lib/builder/reference/mapColorPaletteIntent";
import { mapReferenceBuildIntentToTowerBlueprint } from "@/src/lib/builder/reference/mapReferenceBuildIntentToTowerBlueprint";
import { LANDMARK_TOWER_DEFAULT_INTENT } from "@/src/lib/builder/reference/landmarkTowerDefaults";
import {
  resolveReferenceBuildIntentSync,
  setReferenceIntentExtractorForTests,
} from "@/src/lib/builder/reference/resolveReferenceBuildIntent";
import { mapTowerRefinementPrompt } from "@/src/lib/builder/landmarkTower/mapTowerRefinementPrompt";
import { planAndRefineLandmarkTowerPreview } from "@/src/lib/builder/landmarkTower/planAndRefineLandmarkTowerPreview";

describe("validateLandmarkTowerBlueprint", () => {
  it("validates default preset", () => {
    const result = validateLandmarkTowerBlueprint(LANDMARK_TOWER_DEFAULT);
    expect(result.ok).toBe(true);
    expect(
      result.normalized && isLandmarkTowerBlueprint(result.normalized)
        ? result.normalized.tower.shaftHeight
        : 0,
    ).toBeGreaterThanOrEqual(18);
  });
});

describe("generateLandmarkTower", () => {
  it("emits a tall grounded structure", () => {
    const result = validateLandmarkTowerBlueprint(LANDMARK_TOWER_DEFAULT);
    expect(result.ok).toBe(true);
    const bp = result.normalized!;
    if (!isLandmarkTowerBlueprint(bp)) throw new Error("expected landmark tower");
    const blocks = generateLandmarkTower(bp);
    expect(blocks.length).toBeGreaterThan(0);
    expect(landmarkTowerTotalHeight(bp)).toBeGreaterThanOrEqual(20);
    const maxY = Math.max(...blocks.map((b) => b.y));
    expect(maxY).toBeGreaterThanOrEqual(19);
  });
});

describe("isLandmarkTowerRequest", () => {
  it("matches landmark and Hoover prompts", () => {
    expect(isLandmarkTowerRequest("build a landmark tower")).toBe(true);
    expect(isLandmarkTowerRequest("Stanford Hoover Tower")).toBe(true);
    expect(isLandmarkTowerRequest("make a cottage")).toBe(false);
  });
});

describe("mapColorPaletteIntent", () => {
  it("maps sandstone walls and dark cap", () => {
    const m = mapColorPaletteFromText("make the walls warmer sandstone and darken the cap");
    expect(m.materials.wall).toBe("limestone_bricks");
    expect(m.materials.cap).toBe("slate_tiles");
    expect(m.mappingSummary.length).toBeGreaterThan(0);
  });
});

describe("generateBuildingPreview landmark path", () => {
  it("generates landmark tower for Hoover prompt", () => {
    const result = generateBuildingPreview({
      prompt: "build a Stanford Hoover Tower",
      mode: "create_from_prompt",
    });
    expect(result.ok).toBe(true);
    expect(result.blueprint?.structureType).toBe("landmark_tower");
    expect(result.presetId).toBe("landmark_tower_default");
    expect(result.blockCount).toBeGreaterThan(0);
    expect(result.assistantSummary).toMatch(/approximate landmark tower/i);
    expect(result.assistantSummary).not.toMatch(/exact reconstruction of an exact/i);
  });

  it("Hoover and landmark share the same pipeline", () => {
    const hoover = generateBuildingPreview({
      prompt: "build Hoover Tower",
      mode: "create_from_prompt",
    });
    const landmark = generateBuildingPreview({
      prompt: "build a campus landmark tower",
      mode: "create_from_prompt",
    });
    expect(hoover.ok).toBe(true);
    expect(landmark.ok).toBe(true);
    expect(hoover.blueprint?.structureType).toBe("landmark_tower");
    expect(landmark.blueprint?.structureType).toBe("landmark_tower");
  });
});

describe("resolveReferenceBuildIntent fallback", () => {
  it("uses default intent when test override is null", () => {
    setReferenceIntentExtractorForTests(null);
    const r = resolveReferenceBuildIntentSync("build a landmark tower");
    expect(r?.usedFallback).toBe(true);
    expect(r?.intent.buildingFamily).toBe("landmark_tower");
    setReferenceIntentExtractorForTests(undefined);
  });
});

describe("tower refinements", () => {
  const base = mapReferenceBuildIntentToTowerBlueprint(LANDMARK_TOWER_DEFAULT_INTENT).blueprint;

  it("makes tower taller", async () => {
    const result = await planAndRefineLandmarkTowerPreview({
      prompt: "make it taller",
      blueprint: base,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.blueprint;
    if (!after || !isLandmarkTowerBlueprint(after)) throw new Error("expected tower");
    expect(after.tower.shaftHeight).toBeGreaterThan(base.tower.shaftHeight);
  });

  it("darkens cap material", async () => {
    const result = await planAndRefineLandmarkTowerPreview({
      prompt: "make the cap darker",
      blueprint: base,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.blueprint;
    if (!after || !isLandmarkTowerBlueprint(after)) throw new Error("expected tower");
    expect(after.materials.cap).toBe("slate_tiles");
  });

  it("adds window rows", () => {
    const plan = mapTowerRefinementPrompt("add more vertical windows", base);
    expect(plan?.operations.some((o) => o.op === "updateTowerParams")).toBe(true);
  });
});
