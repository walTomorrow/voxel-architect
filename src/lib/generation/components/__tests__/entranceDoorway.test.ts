import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { compileGenericBuildingToComponentPlan } from "@/src/lib/generation/components/compileGenericBuildingPlan";
import { createPlanContext } from "@/src/lib/generation/components/planContext";
import { generateFromComponentPlan } from "@/src/lib/generation/components/emitFromComponentPlan";
import { emitEntranceOnSide } from "@/src/lib/generation/components/generators/entranceOnSide";
import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";

function entranceSpanOnFront(presetId: string) {
  const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === presetId)!;
  const v = validateBlueprint(structuredClone(preset.blueprint));
  const resolved = v.resolved as ResolvedGenericBuilding;
  const plan = compileGenericBuildingToComponentPlan(resolved);
  const blocks = generateFromComponentPlan(plan);
  const D = plan.grid.depth;
  const lz = D - 1;
  const entranceKeys = [...plan.openings.entranceMask].filter((k) => {
    const [, , z] = k.split(",").map(Number);
    return z === lz;
  });
  const lxVals = entranceKeys.map((k) => Number(k.split(",")[0]!));
  const lo = Math.min(...lxVals);
  const hi = Math.max(...lxVals);
  const ox = -Math.floor(plan.grid.width / 2);
  const oz = -Math.floor(plan.grid.depth / 2);
  const height = resolved.openings.entrance.height;
  return { blocks, lo, hi, lz, ox, oz, height, plan };
}

describe("entrance doorway walkability", () => {
  it("emitEntranceOnSide does not place trim inside the walkable band (y=1..height)", () => {
    const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === "simple_rustic_cabin")!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const plan = compileGenericBuildingToComponentPlan(v.resolved as ResolvedGenericBuilding);
    const entrance = plan.components.find((c) => c.kind === "entrance_on_side")!;
    const ctx = createPlanContext(plan);
    const height = entrance.params.height;
    const placements = emitEntranceOnSide(ctx, entrance, 0);
    expect(
      placements.every((p) => p.y < 1 || p.y > height),
    ).toBe(true);
  });

  it("entrance mask does not include y=0 (floor band is separate from wall aperture)", () => {
    const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === "simple_rustic_cabin")!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const plan = compileGenericBuildingToComponentPlan(v.resolved as ResolvedGenericBuilding);
    const atThreshold = [...plan.openings.entranceMask].filter((k) => {
      const [, y] = k.split(",").map(Number);
      return y === 0;
    });
    expect(atThreshold).toHaveLength(0);
  });

  for (const presetId of ["shed_roof_workshop", "simple_rustic_cabin"] as const) {
    it(`${presetId} has floor at y=0 and clear opening at y=1..height on front`, () => {
      const { blocks, lo, hi, lz, ox, oz, height, plan } = entranceSpanOnFront(presetId);
      const floorId = plan.materials.floor;
      for (let lx = lo; lx <= hi; lx++) {
        const floor = blocks.find(
          (b) => b.x === ox + lx && b.y === 0 && b.z === oz + lz,
        );
        expect(floor?.blockTypeId, `missing threshold floor lx=${lx}`).toBe(
          floorId,
        );

        for (let y = 1; y <= height; y++) {
          const blocked = blocks.find(
            (b) => b.x === ox + lx && b.y === y && b.z === oz + lz,
          );
          expect(blocked, `blocked walk cell lx=${lx} y=${y}`).toBeUndefined();
        }
      }
    });
  }
});
