import type {
  ResolvedStructure,
  StructureBlueprint,
} from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateGenericBuilding } from "@/src/lib/generation/generators/generateGenericBuilding";
import type { VoxelBlock } from "@/src/lib/voxel/types";

/**
 * Validates a blueprint, then runs the matching deterministic generator.
 * Throws if validation fails (use `validateBlueprint()` first for UI flows).
 */
export function generateStructure(blueprint: StructureBlueprint): VoxelBlock[] {
  const result = validateBlueprint(blueprint);
  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
  if (!result.resolved) {
    throw new Error("validateBlueprint returned no resolved blueprint.");
  }
  return generateStructureFromResolved(result.resolved);
}

/** Generate without re-validating (caller must pass validated `ResolvedStructure`). */
export function generateStructureFromResolved(
  resolved: ResolvedStructure,
): VoxelBlock[] {
  if (resolved.structureType !== "generic_building") {
    throw new Error(
      `Unsupported structureType: ${(resolved as { structureType?: string }).structureType ?? "?"}.`,
    );
  }
  return generateGenericBuilding(resolved);
}
