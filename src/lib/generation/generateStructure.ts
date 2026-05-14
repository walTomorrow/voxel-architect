import type {
  ResolvedMedievalTower,
  StructureBlueprint,
} from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateMedievalTower } from "@/src/lib/generation/generators/generateMedievalTower";
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

/** Generate without re-validating (caller must pass validated `ResolvedMedievalTower`). */
export function generateStructureFromResolved(
  resolved: ResolvedMedievalTower,
): VoxelBlock[] {
  switch (resolved.structureType) {
    case "medieval_tower":
      return generateMedievalTower(resolved);
    default: {
      const _exhaust: never = resolved.structureType;
      return _exhaust;
    }
  }
}
