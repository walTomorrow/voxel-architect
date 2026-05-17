import { centerOrigin } from "@/src/lib/generation/placement/placementUtils";
import type { ComponentPlan, PlanContext } from "./types";

export function createPlanContext(plan: ComponentPlan): PlanContext {
  const W = plan.grid.width;
  const D = plan.grid.depth;
  return {
    plan,
    originX: centerOrigin(W),
    originZ: centerOrigin(D),
  };
}

export function worldX(ctx: PlanContext, lx: number): number {
  return ctx.originX + lx;
}

export function worldZ(ctx: PlanContext, lz: number): number {
  return ctx.originZ + lz;
}
