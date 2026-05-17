import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { compileGenericBuildingToComponentPlan } from "@/src/lib/generation/components/compileGenericBuildingPlan";
import { createPlanContext } from "@/src/lib/generation/components/planContext";
import { emitFoundation } from "@/src/lib/generation/components/generators/foundation";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { emitHollowWallShell } from "@/src/lib/generation/components/generators/hollowWallShell";
import { emitRectangularBody } from "@/src/lib/generation/components/generators/rectangularBody";

describe("component generators", () => {
  it("rectangular_body emits zero placements", () => {
    expect(emitRectangularBody()).toEqual([]);
  });

  it("foundation emits full y=0 floor slab including doorway threshold", () => {
    const preset = GENERIC_BUILDING_PRESETS[0]!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const plan = compileGenericBuildingToComponentPlan(
      v.resolved as ResolvedGenericBuilding,
    );
    const ctx = createPlanContext(plan);
    const p = emitFoundation(ctx, 0);
    const W = plan.grid.width;
    const D = plan.grid.depth;
    expect(p).toHaveLength(W * D);
    expect(p.every((q) => q.y === 0)).toBe(true);
    expect(p.every((q) => q.id === plan.materials.floor)).toBe(true);
  });

  it("hollow shell does not emit a second interior floor at y=1", () => {
    const preset = GENERIC_BUILDING_PRESETS[0]!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const plan = compileGenericBuildingToComponentPlan(
      v.resolved as ResolvedGenericBuilding,
    );
    const shell = plan.components.find((c) => c.kind === "hollow_wall_shell")!;
    const ctx = createPlanContext(plan);
    const placements = emitHollowWallShell(ctx, shell, 0);
    expect(
      placements.some((q) => q.p === COMPONENT_PRI.INTERIOR_FLOOR),
    ).toBe(false);
  });

  it("shell skips at least one entrance-masked cell", () => {
    const preset = GENERIC_BUILDING_PRESETS[0]!;
    const v = validateBlueprint(structuredClone(preset.blueprint));
    const plan = compileGenericBuildingToComponentPlan(
      v.resolved as ResolvedGenericBuilding,
    );
    const shell = plan.components.find((c) => c.kind === "hollow_wall_shell")!;
    const ctx = createPlanContext(plan);
    const placements = emitHollowWallShell(ctx, shell, 0);
    const skip = plan.openings.shellSkipMask;
    for (const key of skip) {
      const [lx, y, lz] = key.split(",").map(Number);
      const ox = ctx.originX + lx;
      const oz = ctx.originZ + lz;
      const wall = placements.find((q) => q.x === ox && q.y === y && q.z === oz);
      if (y >= 1 && y <= plan.grid.bodyLayers) {
        expect(wall, `wall at masked ${key}`).toBeUndefined();
      }
    }
  });
});
