import {
  filterGroundedConnected26,
  mergePlacements,
  type GeneratorPlacement,
} from "@/src/lib/generation/placement/placementUtils";
import type { VoxelBlock } from "@/src/lib/voxel/types";
import { emitChimneyV2 } from "./emitters/chimney";
import { emitDoorV2 } from "./emitters/door";
import { emitPorchV2 } from "./emitters/porch";
import { emitRoofV2 } from "./emitters/roof";
import { emitRoomShellV2 } from "./emitters/roomShell";
import { emitStepV2 } from "./emitters/step";
import { emitWindowsFromMaskV2 } from "./emitters/windows";
import { createPlanContextV2 } from "./planContextV2";
import type { ComponentPlanV2, PlanDoorV2 } from "./types";

/**
 * Deterministic emission order (PLAN §7): shell → porch → openings → roof → chimney → step.
 */
export function emitFromComponentPlanV2(plan: ComponentPlanV2): VoxelBlock[] {
  const ctx = createPlanContextV2(plan);
  const all: GeneratorPlacement[] = [];
  let idx = 0;

  const roomShell = plan.components.find((c) => c.kind === "room_shell");
  if (roomShell?.kind === "room_shell") {
    const chunk = emitRoomShellV2(ctx, roomShell, idx);
    all.push(...chunk);
    idx += chunk.length;
  }

  const doors = plan.components.filter((c): c is PlanDoorV2 => c.kind === "door");

  for (const porch of plan.components) {
    if (porch.kind !== "porch") continue;
    const chunk = emitPorchV2(ctx, porch, doors, idx);
    all.push(...chunk);
    idx += chunk.length;
  }

  for (const door of doors) {
    const chunk = emitDoorV2(ctx, door, idx);
    all.push(...chunk);
    idx += chunk.length;
  }

  const windowChunk = emitWindowsFromMaskV2(ctx, idx);
  all.push(...windowChunk);
  idx += windowChunk.length;

  for (const comp of plan.components) {
    if (comp.kind === "roof") {
      const chunk = emitRoofV2(ctx, comp, idx);
      all.push(...chunk);
      idx += chunk.length;
    }
  }

  for (const comp of plan.components) {
    if (comp.kind === "chimney") {
      const chunk = emitChimneyV2(ctx, comp, idx);
      all.push(...chunk);
      idx += chunk.length;
    }
  }

  for (const comp of plan.components) {
    if (comp.kind === "step") {
      const chunk = emitStepV2(ctx, comp, idx);
      all.push(...chunk);
      idx += chunk.length;
    }
  }

  let blocks = mergePlacements(all);
  if (!plan.constraints.allowFloatingBlocks) {
    blocks = filterGroundedConnected26(blocks, false);
  }
  return blocks;
}
