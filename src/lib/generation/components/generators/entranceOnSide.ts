import {
  entranceSpanRange,
  facadeInteriorSpan,
} from "@/src/lib/generation/components/geometry/facadeSides";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type { EntranceOnSideComponent, PlanContext } from "@/src/lib/generation/components/types";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

/**
 * Trim only — walkable opening stays empty (y=1..height). Lintel sits on the first wall row above the opening.
 */
export function emitEntranceOnSide(
  ctx: PlanContext,
  component: EntranceOnSideComponent,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const shell = plan.components.find((c) => c.kind === "hollow_wall_shell");
  const wallT =
    shell && shell.kind === "hollow_wall_shell"
      ? shell.params.wallThickness
      : 1;

  const { side, width, height } = component.params;
  const { lo: spanLo, hi: spanHi } = facadeInteriorSpan(side, W, D, wallT);
  const { lo, hi } = entranceSpanRange(spanLo, spanHi, width);
  const lintelY = height + 1;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  const placeAccent = (lx: number, y: number, lz: number) => {
    out.push({
      x: worldX(ctx, lx),
      y,
      z: worldZ(ctx, lz),
      p: COMPONENT_PRI.DOOR_OR_TRIM,
      id: plan.materials.accent,
      i: i++,
    });
  };

  if (side === "front") {
    const lz = D - 1;
    if (lintelY <= plan.grid.bodyLayers) {
      for (let lx = lo; lx <= hi; lx++) placeAccent(lx, lintelY, lz);
    }
    if (height >= 3 && lo > 0) placeAccent(lo - 1, 2, lz);
    if (height >= 3 && hi < W - 1) placeAccent(hi + 1, 2, lz);
  } else if (side === "back") {
    const lz = 0;
    if (lintelY <= plan.grid.bodyLayers) {
      for (let lx = lo; lx <= hi; lx++) placeAccent(lx, lintelY, lz);
    }
    if (height >= 3 && lo > 0) placeAccent(lo - 1, 2, lz);
    if (height >= 3 && hi < W - 1) placeAccent(hi + 1, 2, lz);
  } else if (side === "left") {
    const lx = 0;
    if (lintelY <= plan.grid.bodyLayers) {
      for (let lz = lo; lz <= hi; lz++) placeAccent(lx, lintelY, lz);
    }
    if (height >= 3 && lo > 0) placeAccent(lx, 2, lo - 1);
    if (height >= 3 && hi < D - 1) placeAccent(lx, 2, hi + 1);
  } else {
    const lx = W - 1;
    if (lintelY <= plan.grid.bodyLayers) {
      for (let lz = lo; lz <= hi; lz++) placeAccent(lx, lintelY, lz);
    }
    if (height >= 3 && lo > 0) placeAccent(lx, 2, lo - 1);
    if (height >= 3 && hi < D - 1) placeAccent(lx, 2, hi + 1);
  }

  return out;
}
