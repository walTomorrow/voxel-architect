import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { deriveOpeningsForGenericBuilding } from "@/src/lib/generation/components/geometry/openingMask";
import { compileGenericBuildingToComponentPlan } from "@/src/lib/generation/components/compileGenericBuildingPlan";
import { generateFromComponentPlan } from "@/src/lib/generation/components/emitFromComponentPlan";

function resolvedGeneric(
  presetId: string,
): ResolvedGenericBuilding {
  const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === presetId)!;
  const v = validateBlueprint(structuredClone(preset.blueprint));
  expect(v.ok).toBe(true);
  expect(v.resolved?.structureType).toBe("generic_building");
  return v.resolved as ResolvedGenericBuilding;
}

describe("opening mask derivation", () => {
  it("includes entrance and window cells in shell skip mask", () => {
    const resolved = resolvedGeneric("simple_rustic_cabin");
    const openings = deriveOpeningsForGenericBuilding(resolved);
    expect(openings.entranceMask.size).toBeGreaterThan(0);
    expect(openings.windowMask.size).toBeGreaterThan(0);
    for (const k of openings.windowMask) {
      expect(openings.shellSkipMask.has(k)).toBe(true);
    }
    for (const k of openings.entranceMask) {
      expect(openings.shellSkipMask.has(k)).toBe(true);
    }
  });

  it("entrance mask starts at y=1 (threshold floor is not part of wall aperture)", () => {
    const resolved = resolvedGeneric("simple_rustic_cabin");
    const openings = deriveOpeningsForGenericBuilding(resolved);
    const D = resolved.grid.depth;
    const frontRow = [...openings.entranceMask].filter((k) => {
      const [, , lz] = k.split(",").map(Number);
      return lz === D - 1;
    });
    expect(frontRow.length).toBeGreaterThan(0);
    expect(frontRow.every((k) => Number(k.split(",")[1]) >= 1)).toBe(true);
  });

  it("shell skip prevents wall blocks in open doorway (mid opening)", () => {
    const resolved = resolvedGeneric("simple_rustic_cabin");
    const plan = compileGenericBuildingToComponentPlan(resolved);
    const blocks = generateFromComponentPlan(plan);
    const midOpening = [...plan.openings.entranceMask].find((k) => {
      const [, y] = k.split(",").map(Number);
      return y === 2;
    });
    expect(midOpening).toBeDefined();
    const [lx, y, lz] = midOpening!.split(",").map(Number);
    const ox = -Math.floor(plan.grid.width / 2);
    const oz = -Math.floor(plan.grid.depth / 2);
    const hit = blocks.find(
      (b) => b.x === ox + lx && b.y === y && b.z === oz + lz,
    );
    expect(hit).toBeUndefined();
  });

  it("foundation fills doorway threshold at y=0", () => {
    const resolved = resolvedGeneric("shed_roof_workshop");
    const plan = compileGenericBuildingToComponentPlan(resolved);
    const blocks = generateFromComponentPlan(plan);
    const frontLz = plan.grid.depth - 1;
    const frontKeys = [...plan.openings.entranceMask].filter((k) => {
      const [, , lz] = k.split(",").map(Number);
      return lz === frontLz;
    });
    const lxVals = frontKeys.map((k) => Number(k.split(",")[0]!));
    const lo = Math.min(...lxVals);
    const hi = Math.max(...lxVals);
    const ox = -Math.floor(plan.grid.width / 2);
    const oz = -Math.floor(plan.grid.depth / 2);
    for (let lx = lo; lx <= hi; lx++) {
      const hit = blocks.find(
        (b) => b.x === ox + lx && b.y === 0 && b.z === oz + frontLz,
      );
      expect(hit?.blockTypeId).toBe(plan.materials.floor);
    }
  });
});
