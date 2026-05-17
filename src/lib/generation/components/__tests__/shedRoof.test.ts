import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { compileGenericBuildingToComponentPlan } from "@/src/lib/generation/components/compileGenericBuildingPlan";
import { createPlanContext } from "@/src/lib/generation/components/planContext";
import { generateFromComponentPlan } from "@/src/lib/generation/components/emitFromComponentPlan";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import {
  emitShedRoof,
  shedRiseForLocalLz,
} from "@/src/lib/generation/components/generators/roofs";
import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";

describe("shed roof", () => {
  it("shedRiseForLocalLz covers back and front rows", () => {
    expect(shedRiseForLocalLz(0, 9, 2)).toBe(1);
    expect(shedRiseForLocalLz(8, 9, 2)).toBe(2);
  });

  it("shed_roof_workshop retains roof over full footprint after grounding", () => {
    const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === "shed_roof_workshop")!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const resolved = v.resolved as ResolvedGenericBuilding;
    const plan = compileGenericBuildingToComponentPlan(resolved);
    const blocks = generateFromComponentPlan(plan);
    const roofId = resolved.materials.roof;
    const H = plan.grid.bodyLayers;
    const roofAboveWalls = blocks.filter(
      (b) => b.blockTypeId === roofId && b.y > H,
    );
    const W = plan.grid.width;
    const D = plan.grid.depth;
    const minExpected = (W + 2) * (D + 2);
    expect(roofAboveWalls.length).toBeGreaterThanOrEqual(minExpected);
  });

  it("emitShedRoof places roof at back row (lz=0) not only front", () => {
    const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === "shed_roof_workshop")!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const plan = compileGenericBuildingToComponentPlan(v.resolved as ResolvedGenericBuilding);
    const ctx = createPlanContext(plan);
    const roof = plan.components.find((c) => c.kind === "shed_roof")!;
    const placements = emitShedRoof(ctx, roof, 0);
    const H = plan.grid.bodyLayers;
    const backRow = placements.filter(
      (p) =>
        p.p === COMPONENT_PRI.ROOF &&
        p.z === ctx.originZ + 0 &&
        p.y === H + 1,
    );
    expect(backRow.length).toBeGreaterThan(0);
  });
});
