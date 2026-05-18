import { outsideCellOffset } from "@/src/lib/generation/components/geometry/facadeSides";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import { roomDepth, roomWidth, worldX, worldZ, type PlanContextV2 } from "../planContextV2";
import type { PlanStepV2 } from "../types";

export function emitStepV2(
  ctx: PlanContextV2,
  component: PlanStepV2,
  startIndex: number,
): GeneratorPlacement[] {
  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  const { side, spanLo, spanHi } = component.anchor;
  const mid = Math.floor((spanLo + spanHi) / 2);
  const { dlx, dlz } = outsideCellOffset(side);

  let baseLx = 0;
  let baseLz = 0;
  if (side === "front") {
    baseLx = mid;
    baseLz = D - 1;
  } else if (side === "back") {
    baseLx = mid;
    baseLz = 0;
  } else if (side === "left") {
    baseLx = 0;
    baseLz = mid;
  } else {
    baseLx = W - 1;
    baseLz = mid;
  }

  return [
    {
      x: worldX(ctx, baseLx + dlx),
      y: 0,
      z: worldZ(ctx, baseLz + dlz),
      p: COMPONENT_PRI.FRONT_STEP,
      id: ctx.plan.materials.floor,
      i: startIndex,
    },
  ];
}
