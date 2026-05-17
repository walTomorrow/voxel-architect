import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";
import { compileGenericBuildingToComponentPlan } from "@/src/lib/generation/components/compileGenericBuildingPlan";
import { generateFromComponentPlan } from "@/src/lib/generation/components/emitFromComponentPlan";
import type { VoxelBlock } from "@/src/lib/voxel/types";

export function generateGenericBuilding(
  resolved: ResolvedGenericBuilding,
): VoxelBlock[] {
  const plan = compileGenericBuildingToComponentPlan(resolved);
  return generateFromComponentPlan(plan);
}
