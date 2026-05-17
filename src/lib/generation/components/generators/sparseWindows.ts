import { parseLocalApertureKey } from "@/src/lib/generation/components/geometry/localKeys";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type { PlanContext } from "@/src/lib/generation/components/types";
import { paneAxisForWindowCell } from "@/src/lib/generation/facade/paneAxis";
import { isShapeAllowedForBlockType } from "@/src/lib/voxel/blocks/materialMetaHelpers";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

export function emitSparseWindows(
  ctx: PlanContext,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  for (const key of plan.openings.windowMask) {
    const { lx, y, lz } = parseLocalApertureKey(key);
    const axis = paneAxisForWindowCell(lx, lz, W, D);
    const usePane =
      axis !== undefined &&
      isShapeAllowedForBlockType(plan.materials.window, "pane");
    out.push({
      x: worldX(ctx, lx),
      y,
      z: worldZ(ctx, lz),
      p: COMPONENT_PRI.WINDOW,
      id: plan.materials.window,
      i: i++,
      ...(usePane
        ? { shapeKind: "pane" as const, state: { axis } }
        : {}),
    });
  }
  return out;
}
