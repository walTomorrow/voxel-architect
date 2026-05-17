import {
  filterGroundedConnected26,
  mergePlacements,
  type GeneratorPlacement,
} from "@/src/lib/generation/placement/placementUtils";
import type { VoxelBlock } from "@/src/lib/voxel/types";
import { createPlanContext } from "./planContext";
import { emitChimney } from "./generators/chimney";
import { emitEntranceOnSide } from "./generators/entranceOnSide";
import { emitFoundation } from "./generators/foundation";
import { emitFrontStep } from "./generators/frontStep";
import { emitHollowWallShell } from "./generators/hollowWallShell";
import { emitPitchedGableRoof, emitShedRoof } from "./generators/roofs";
import { emitRectangularBody } from "./generators/rectangularBody";
import { emitSparseWindows } from "./generators/sparseWindows";
import type { ComponentPlan, PlannedComponent } from "./types";

function emitComponent(
  component: PlannedComponent,
  ctx: ReturnType<typeof createPlanContext>,
  startIndex: number,
): GeneratorPlacement[] {
  switch (component.kind) {
    case "rectangular_body":
      return emitRectangularBody();
    case "foundation":
      return emitFoundation(ctx, startIndex);
    case "hollow_wall_shell":
      return emitHollowWallShell(ctx, component, startIndex);
    case "entrance_on_side":
      return emitEntranceOnSide(ctx, component, startIndex);
    case "sparse_windows":
      return emitSparseWindows(ctx, startIndex);
    case "pitched_gable_roof":
      return emitPitchedGableRoof(ctx, component, startIndex);
    case "shed_roof":
      return emitShedRoof(ctx, component, startIndex);
    case "chimney":
      return emitChimney(ctx, component, startIndex);
    case "front_step": {
      const entrance = ctx.plan.components.find(
        (c) => c.id === "entrance_main" && c.kind === "entrance_on_side",
      );
      if (!entrance || entrance.kind !== "entrance_on_side") return [];
      return emitFrontStep(ctx, entrance, startIndex);
    }
    default: {
      const _exhaust: never = component;
      return _exhaust;
    }
  }
}

export function generateFromComponentPlan(plan: ComponentPlan): VoxelBlock[] {
  const ctx = createPlanContext(plan);
  const all: GeneratorPlacement[] = [];
  let idx = 0;
  for (const component of plan.components) {
    const chunk = emitComponent(component, ctx, idx);
    all.push(...chunk);
    idx += chunk.length;
  }
  let blocks = mergePlacements(all);
  if (!plan.constraints.allowFloatingBlocks) {
    blocks = filterGroundedConnected26(blocks, false);
  }
  return blocks;
}
