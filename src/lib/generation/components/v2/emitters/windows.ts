import { parseLocalApertureKey } from "@/src/lib/generation/components/geometry/localKeys";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { paneAxisForWindowCell } from "@/src/lib/generation/facade/paneAxis";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import { isShapeAllowedForBlockType } from "@/src/lib/voxel/blocks/materialMetaHelpers";
import { roomDepth, roomWidth, worldX, worldZ, type PlanContextV2 } from "../planContextV2";

/** Emit window panes from plan-level aperture mask (Phase 3 source of truth). */
export function emitWindowsFromMaskV2(
  ctx: PlanContextV2,
  startIndex: number,
): GeneratorPlacement[] {
  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  for (const key of ctx.plan.openings.windowMask) {
    const { lx, y, lz } = parseLocalApertureKey(key);
    const axis = paneAxisForWindowCell(lx, lz, W, D);
    const usePane =
      axis !== undefined &&
      isShapeAllowedForBlockType(ctx.plan.materials.window, "pane");
    out.push({
      x: worldX(ctx, lx),
      y,
      z: worldZ(ctx, lz),
      p: COMPONENT_PRI.WINDOW,
      id: ctx.plan.materials.window,
      i: i++,
      ...(usePane ? { shapeKind: "pane" as const, state: { axis } } : {}),
    });
  }
  return out;
}
