import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type { ChimneyComponent, PlanContext } from "@/src/lib/generation/components/types";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

export function emitChimney(
  ctx: PlanContext,
  component: ChimneyComponent,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const H = plan.grid.bodyLayers;
  const R = plan.grid.roofLayers;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  const lx = component.params.side === "left" ? 0 : W - 1;
  const lz = Math.floor(D / 2);
  const topY = H + R + 1;

  for (let y = 1; y <= topY; y++) {
    out.push({
      x: worldX(ctx, lx),
      y,
      z: worldZ(ctx, lz),
      p: COMPONENT_PRI.CHIMNEY,
      id: plan.materials.accent,
      i: i++,
    });
    if (lx === 0 && W > 1) {
      out.push({
        x: worldX(ctx, 1),
        y,
        z: worldZ(ctx, lz),
        p: COMPONENT_PRI.CHIMNEY,
        id: plan.materials.accent,
        i: i++,
      });
    } else if (lx === W - 1 && W > 1) {
      out.push({
        x: worldX(ctx, W - 2),
        y,
        z: worldZ(ctx, lz),
        p: COMPONENT_PRI.CHIMNEY,
        id: plan.materials.accent,
        i: i++,
      });
    }
  }
  return out;
}
