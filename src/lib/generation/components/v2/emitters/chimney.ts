import { facadeInteriorSpan } from "@/src/lib/generation/components/geometry/facadeSides";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import {
  bodyLayers,
  roomDepth,
  roomWidth,
  worldX,
  worldZ,
  type PlanContextV2,
} from "../planContextV2";
import type { PlanChimneyV2 } from "../types";

export function emitChimneyV2(
  ctx: PlanContextV2,
  component: PlanChimneyV2,
  startIndex: number,
): GeneratorPlacement[] {
  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  const H = bodyLayers(ctx);
  const R = ctx.plan.bounds.roofLayers;
  const T = ctx.roomShell.params.wallThickness;
  const { side, horizontal } = component.params;
  const { lo, hi } = facadeInteriorSpan(side, W, D, T);
  let along = Math.floor((lo + hi) / 2);
  if (horizontal === "left") along = lo;
  else if (horizontal === "right") along = hi;

  let lx = 0;
  let lz = 0;
  if (side === "front") {
    lx = along;
    lz = D - 1;
  } else if (side === "back") {
    lx = along;
    lz = 0;
  } else if (side === "left") {
    lx = 0;
    lz = along;
  } else {
    lx = W - 1;
    lz = along;
  }

  const topY = H + R + 1;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  const stack = (x: number, z: number) => {
    for (let y = 1; y <= topY; y++) {
      out.push({
        x: worldX(ctx, x),
        y,
        z: worldZ(ctx, z),
        p: COMPONENT_PRI.CHIMNEY,
        id: ctx.plan.materials.accent,
        i: i++,
      });
    }
  };

  stack(lx, lz);
  if (side === "left" && W > 1) stack(1, lz);
  else if (side === "right" && W > 1) stack(W - 2, lz);
  else if (side === "front" && D > 1) stack(lx, D - 2);
  else if (side === "back" && D > 1) stack(lx, 1);

  return out;
}
