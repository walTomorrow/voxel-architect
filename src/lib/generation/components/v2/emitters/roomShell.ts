import { isExteriorCell } from "@/src/lib/generation/components/geometry/openingMask";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import { bodyLayers, worldX, worldZ, type PlanContextV2 } from "../planContextV2";
import type { PlanRoomShellV2 } from "../types";

function inShell(
  lx: number,
  lz: number,
  W: number,
  D: number,
  T: number,
): boolean {
  return (
    (lx < T || lx >= W - T || lz < T || lz >= D - T) && isExteriorCell(lx, lz, W, D)
  );
}

export function emitRoomShellV2(
  ctx: PlanContextV2,
  component: PlanRoomShellV2,
  startIndex: number,
): GeneratorPlacement[] {
  const W = component.params.width;
  const D = component.params.depth;
  const H = bodyLayers(ctx);
  const T = component.params.wallThickness;
  const skip = ctx.plan.openings.shellSkipMask;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  for (let lx = 0; lx < W; lx++) {
    for (let lz = 0; lz < D; lz++) {
      out.push({
        x: worldX(ctx, lx),
        y: 0,
        z: worldZ(ctx, lz),
        p: COMPONENT_PRI.FOUNDATION,
        id: ctx.plan.materials.floor,
        i: i++,
      });
    }
  }

  for (let y = 1; y <= H; y++) {
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        if (!inShell(lx, lz, W, D, T)) continue;
        const key = `${lx},${y},${lz}`;
        if (skip.has(key)) continue;
        out.push({
          x: worldX(ctx, lx),
          y,
          z: worldZ(ctx, lz),
          p: COMPONENT_PRI.WALL,
          id: ctx.plan.materials.wall,
          i: i++,
        });
      }
    }
  }

  return out;
}
