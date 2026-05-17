import { COMPONENT_PRI } from "@/src/lib/generation/components/priorities";
import { worldX, worldZ } from "@/src/lib/generation/components/planContext";
import type {
  PitchedGableRoofComponent,
  PlanContext,
  ShedRoofComponent,
} from "@/src/lib/generation/components/types";
import type { GeneratorPlacement } from "@/src/lib/generation/placement/placementUtils";

/** Roof layer count at local lz: 1 at back (lz=0), `layers` at front (lz=D-1). */
export function shedRiseForLocalLz(
  localLz: number,
  depth: number,
  layers: number,
): number {
  if (layers <= 1) return 1;
  if (depth <= 1) return layers;
  return 1 + Math.floor((localLz * (layers - 1)) / (depth - 1));
}

function fillFootprintLayer(
  ctx: PlanContext,
  y: number,
  lx0: number,
  lx1: number,
  lz0: number,
  lz1: number,
  startIndex: number,
): { placements: GeneratorPlacement[]; nextIndex: number } {
  const { plan } = ctx;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;
  for (let lx = lx0; lx <= lx1; lx++) {
    for (let lz = lz0; lz <= lz1; lz++) {
      out.push({
        x: worldX(ctx, lx),
        y,
        z: worldZ(ctx, lz),
        p: COMPONENT_PRI.ROOF,
        id: plan.materials.roof,
        i: i++,
      });
    }
  }
  return { placements: out, nextIndex: i };
}

export function emitPitchedGableRoof(
  ctx: PlanContext,
  component: PitchedGableRoofComponent,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const H = plan.grid.bodyLayers;
  const layers = component.params.layers;
  const O = component.params.overhang;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;
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
    const chunk = fillFootprintLayer(ctx, y, lx0, lx1, lz0, lz1, i);
    out.push(...chunk.placements);
    i = chunk.nextIndex;
  }
  return out;
}

export function emitShedRoof(
  ctx: PlanContext,
  component: ShedRoofComponent,
  startIndex: number,
): GeneratorPlacement[] {
  const { plan } = ctx;
  const W = plan.grid.width;
  const D = plan.grid.depth;
  const H = plan.grid.bodyLayers;
  const layers = Math.max(1, component.params.layers);
  const O = component.params.overhang;
  const out: GeneratorPlacement[] = [];
  let i = startIndex;

  for (let lx = -O; lx <= W - 1 + O; lx++) {
    for (let lz = -O; lz <= D - 1 + O; lz++) {
      const localLz = Math.max(0, Math.min(D - 1, lz));
      const rise = shedRiseForLocalLz(localLz, D, layers);
      for (let r = 0; r < rise; r++) {
        out.push({
          x: worldX(ctx, lx),
          y: H + 1 + r,
          z: worldZ(ctx, lz),
          p: COMPONENT_PRI.ROOF,
          id: plan.materials.roof,
          i: i++,
        });
      }
    }
  }
  return out;
}
