import { centerOrigin } from "@/src/lib/generation/placement/placementUtils";
import type { ComponentPlanV2, PlanRoomShellV2 } from "./types";

export interface PlanContextV2 {
  readonly plan: ComponentPlanV2;
  readonly originX: number;
  readonly originZ: number;
  readonly roomShell: PlanRoomShellV2;
}

export function createPlanContextV2(plan: ComponentPlanV2): PlanContextV2 {
  const roomShell = plan.components.find((c) => c.kind === "room_shell");
  if (!roomShell || roomShell.kind !== "room_shell") {
    throw new Error("ComponentPlanV2 requires a room_shell component.");
  }
  const W = plan.bounds.width;
  const D = plan.bounds.depth;
  return {
    plan,
    originX: centerOrigin(W) + plan.bounds.origin.x,
    originZ: centerOrigin(D) + plan.bounds.origin.z,
    roomShell,
  };
}

export function worldX(ctx: PlanContextV2, lx: number): number {
  return ctx.originX + lx;
}

export function worldZ(ctx: PlanContextV2, lz: number): number {
  return ctx.originZ + lz;
}

export function roomWidth(ctx: PlanContextV2): number {
  return ctx.roomShell.params.width;
}

export function roomDepth(ctx: PlanContextV2): number {
  return ctx.roomShell.params.depth;
}

export function bodyLayers(ctx: PlanContextV2): number {
  return ctx.plan.bounds.bodyLayers;
}
