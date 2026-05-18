import { outsideCellOffset } from "@/src/lib/generation/components/geometry/facadeSides";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import { roomDepth, roomWidth, worldX, worldZ, type PlanContextV2 } from "../planContextV2";
import type { PlanDoorV2, PlanPorchV2 } from "../types";

function porchSpan(
  ctx: PlanContextV2,
  porch: PlanPorchV2,
  doors: readonly PlanDoorV2[],
): { lo: number; hi: number } {
  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  if (porch.params.widthMode === "full_facade") {
    if (porch.params.side === "front" || porch.params.side === "back") {
      return { lo: 0, hi: W - 1 };
    }
    return { lo: 0, hi: D - 1 };
  }
  const doorId = porch.params.aroundDoorId;
  const door = doors.find((d) => d.sourceComponentId === doorId);
  if (door) {
    return { lo: door.aperture.spanLo, hi: door.aperture.spanHi };
  }
  return { lo: Math.floor(W / 2), hi: Math.floor(W / 2) };
}

export function emitPorchV2(
  ctx: PlanContextV2,
  component: PlanPorchV2,
  doors: readonly PlanDoorV2[],
  startIndex: number,
): GeneratorPlacement[] {
  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  const { side, depth } = component.params;
  const { lo, hi } = porchSpan(ctx, component, doors);
  const { dlx, dlz } = outsideCellOffset(side);
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  let baseLx = 0;
  let baseLz = 0;
  if (side === "front") {
    baseLz = D - 1;
  } else if (side === "back") {
    baseLz = 0;
  } else if (side === "left") {
    baseLx = 0;
  } else {
    baseLx = W - 1;
  }

  for (let d = 1; d <= depth; d++) {
    const offset = d;
    if (side === "front" || side === "back") {
      for (let lx = lo; lx <= hi; lx++) {
        const lz = baseLz + dlz * offset;
        out.push({
          x: worldX(ctx, lx),
          y: 0,
          z: worldZ(ctx, lz),
          p: COMPONENT_PRI.PORCH,
          id: ctx.plan.materials.floor,
          i: i++,
        });
      }
    } else {
      for (let lz = lo; lz <= hi; lz++) {
        const lx = baseLx + dlx * offset;
        out.push({
          x: worldX(ctx, lx),
          y: 0,
          z: worldZ(ctx, lz),
          p: COMPONENT_PRI.PORCH,
          id: ctx.plan.materials.floor,
          i: i++,
        });
      }
    }
  }

  return out;
}
