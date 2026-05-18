import type { ResolvedGenericBuildingV2 } from "@/src/lib/blueprints/types/resolvedGenericBuildingV2";
import { compileGenericBuildingV2Plan } from "@/src/lib/generation/components/v2/compileGenericBuildingV2Plan";
import { emitFromComponentPlanV2 } from "@/src/lib/generation/components/v2/emitFromComponentPlanV2";
import type { VoxelBlock } from "@/src/lib/voxel/types";

export function generateGenericBuildingV2(
  resolved: ResolvedGenericBuildingV2,
): VoxelBlock[] {
  const plan = compileGenericBuildingV2Plan(resolved);
  return emitFromComponentPlanV2(plan);
}
