import {
  entranceSpanRange,
  facadeInteriorSpan,
  outsideCellOffset,
} from "@/src/lib/generation/components/geometry/facadeSides";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type { EntranceOnSideComponent, PlanContext } from "@/src/lib/generation/components/types";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

/** Single exterior step outside the entrance — does not fill the doorway threshold. */
export function emitFrontStep(
  ctx: PlanContext,
  entrance: EntranceOnSideComponent,
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

  const { side, width } = entrance.params;
  const { lo: spanLo, hi: spanHi } = facadeInteriorSpan(side, W, D, wallT);
  const { lo, hi } = entranceSpanRange(spanLo, spanHi, width);
  const mid = Math.floor((lo + hi) / 2);
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

  const stepLx = baseLx + dlx;
  const stepLz = baseLz + dlz;

  return [
    {
      x: worldX(ctx, stepLx),
      y: 0,
      z: worldZ(ctx, stepLz),
      p: COMPONENT_PRI.FRONT_STEP,
      id: plan.materials.floor,
      i: startIndex,
    },
  ];
}
