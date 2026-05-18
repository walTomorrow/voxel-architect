import { parseLocalApertureKey } from "@/src/lib/generation/components/geometry/localKeys";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import { bodyLayers, roomDepth, roomWidth, worldX, worldZ, type PlanContextV2 } from "../planContextV2";
import type { PlanDoorV2 } from "../types";

export function emitDoorV2(
  ctx: PlanContextV2,
  component: PlanDoorV2,
  startIndex: number,
): GeneratorPlacement[] {
  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  const { side, height, spanLo, spanHi } = component.aperture;
  const lo = spanLo;
  const hi = spanHi;
  const lintelY = height + 1;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  const place = (lx: number, y: number, lz: number, material: typeof ctx.plan.materials.door, pri: number) => {
    out.push({
      x: worldX(ctx, lx),
      y,
      z: worldZ(ctx, lz),
      p: pri,
      id: material,
      i: i++,
    });
  };

  for (const key of ctx.plan.openings.doorMask) {
    const { lx, y, lz } = parseLocalApertureKey(key);
    place(lx, y, lz, ctx.plan.materials.door, COMPONENT_PRI.DOOR_OR_TRIM);
  }

  const accent = ctx.plan.materials.accent;
  const trimPri = COMPONENT_PRI.DOOR_OR_TRIM;

  if (side === "front") {
    const lz = D - 1;
    if (lintelY <= bodyLayers(ctx)) {
      for (let lx = lo; lx <= hi; lx++) place(lx, lintelY, lz, accent, trimPri);
    }
    if (height >= 3 && lo > 0) place(lo - 1, 2, lz, accent, trimPri);
    if (height >= 3 && hi < W - 1) place(hi + 1, 2, lz, accent, trimPri);
  } else if (side === "back") {
    const lz = 0;
    if (lintelY <= bodyLayers(ctx)) {
      for (let lx = lo; lx <= hi; lx++) place(lx, lintelY, lz, accent, trimPri);
    }
    if (height >= 3 && lo > 0) place(lo - 1, 2, lz, accent, trimPri);
    if (height >= 3 && hi < W - 1) place(hi + 1, 2, lz, accent, trimPri);
  } else if (side === "left") {
    const lx = 0;
    if (lintelY <= bodyLayers(ctx)) {
      for (let lz = lo; lz <= hi; lz++) place(lx, lintelY, lz, accent, trimPri);
    }
    if (height >= 3 && lo > 0) place(lx, 2, lo - 1, accent, trimPri);
    if (height >= 3 && hi < D - 1) place(lx, 2, hi + 1, accent, trimPri);
  } else {
    const lx = W - 1;
    if (lintelY <= bodyLayers(ctx)) {
      for (let lz = lo; lz <= hi; lz++) place(lx, lintelY, lz, accent, trimPri);
    }
    if (height >= 3 && lo > 0) place(lx, 2, lo - 1, accent, trimPri);
    if (height >= 3 && hi < D - 1) place(lx, 2, hi + 1, accent, trimPri);
  }

  return out;
}
