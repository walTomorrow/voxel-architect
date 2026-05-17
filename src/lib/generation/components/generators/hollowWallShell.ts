import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type { HollowWallShellComponent, PlanContext } from "@/src/lib/generation/components/types";
import { isExteriorCell } from "@/src/lib/generation/components/geometry/openingMask";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

function inShell(
  lx: number,
  lz: number,
  W: number,
  D: number,
  T: number,
): boolean {
  return (
    lx < T ||
    lx >= W - T ||
    lz < T ||
    lz >= D - T
  ) && isExteriorCell(lx, lz, W, D);
}

export function emitHollowWallShell(
  ctx: PlanContext,
  component: HollowWallShellComponent,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const H = plan.grid.bodyLayers;
  const T = component.params.wallThickness;
  const skip = plan.openings.shellSkipMask;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

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
          id: plan.materials.wall,
          i: i++,
        });
      }
    }
  }
  return out;
}
