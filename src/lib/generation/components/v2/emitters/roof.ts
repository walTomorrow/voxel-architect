import { shedRiseForLocalLz } from "@/src/lib/generation/components/generators/roofs";
import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";
import { bodyLayers, roomDepth, roomWidth, worldX, worldZ, type PlanContextV2 } from "../planContextV2";
import type { PlanRoofV2 } from "../types";

function fillLayer(
  ctx: PlanContextV2,
  y: number,
  lx0: number,
  lx1: number,
  lz0: number,
  lz1: number,
  startIndex: number,
): { placements: GeneratorPlacement[]; nextIndex: number } {
  const out: GeneratorPlacement[] = [];
  let i = startIndex;
  for (let lx = lx0; lx <= lx1; lx++) {
    for (let lz = lz0; lz <= lz1; lz++) {
      out.push({
        x: worldX(ctx, lx),
        y,
        z: worldZ(ctx, lz),
        p: COMPONENT_PRI.ROOF,
        id: ctx.plan.materials.roof,
        i: i++,
      });
    }
  }
  return { placements: out, nextIndex: i };
}

export function emitRoofV2(
  ctx: PlanContextV2,
  component: PlanRoofV2,
  startIndex: number,
): GeneratorPlacement[] {
  if (component.params.kind === "none" || component.params.layers <= 0) {
    return [];
  }

  const W = roomWidth(ctx);
  const D = roomDepth(ctx);
  const H = bodyLayers(ctx);
  const layers = component.params.layers;
  const O = component.params.overhang;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  if (component.params.kind === "pitched_gable") {
    const ridgeAlongX = W >= D;
    for (let r = 0; r < layers; r++) {
      const y = H + 1 + r;
      const inset = r;
      let lx0 = Math.max(0, -O + inset);
      let lx1 = Math.min(W - 1, W - 1 + O - inset);
      let lz0 = Math.max(0, -O + inset);
      let lz1 = Math.min(D - 1, D - 1 + O - inset);
      if (ridgeAlongX) {
        lz0 = Math.max(lz0, inset);
        lz1 = Math.min(lz1, D - 1 - inset);
      } else {
        lx0 = Math.max(lx0, inset);
        lx1 = Math.min(lx1, W - 1 - inset);
      }
      const chunk = fillLayer(ctx, y, lx0, lx1, lz0, lz1, i);
      out.push(...chunk.placements);
      i = chunk.nextIndex;
    }
    return out;
  }

  const orientation = component.params.orientation ?? "front_back";
  for (let lx = -O; lx <= W - 1 + O; lx++) {
    for (let lz = -O; lz <= D - 1 + O; lz++) {
      let rise: number;
      if (orientation === "left_right") {
        const localLx = Math.max(0, Math.min(W - 1, lx));
        rise = shedRiseForLocalLz(localLx, W, layers);
      } else {
        const localLz = Math.max(0, Math.min(D - 1, lz));
        rise = shedRiseForLocalLz(localLz, D, layers);
      }
      for (let r = 0; r < rise; r++) {
        out.push({
          x: worldX(ctx, lx),
          y: H + 1 + r,
          z: worldZ(ctx, lz),
          p: COMPONENT_PRI.ROOF,
          id: ctx.plan.materials.roof,
          i: i++,
        });
      }
    }
  }
  return out;
}
