import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type { PlanContext } from "@/src/lib/generation/components/types";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

/** Full footprint floor slab at y=0, including doorway threshold cells. */
export function emitFoundation(
  ctx: PlanContext,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;
  for (let lx = 0; lx < W; lx++) {
    for (let lz = 0; lz < D; lz++) {
      out.push({
        x: worldX(ctx, lx),
        y: 0,
        z: worldZ(ctx, lz),
        p: COMPONENT_PRI.FOUNDATION,
        id: plan.materials.floor,
        i: i++,
      });
    }
  }
  return out;
}
