/**
 * Combined placement validation: structural shape/state (geometry rules) plus
 * material/shape semantics (companion metadata). Does not replace the underlying
 * helpers or alter **`analyzeVoxelStructure`** occupancy semantics.
 */

import type { VoxelBlock, VoxelStructure } from "./types";
import { validateVoxelBlockMaterialShape } from "./blocks/materialMetaHelpers";
import { validateVoxelBlockShapeState } from "./voxelBlockShape";

export interface VoxelBlockPlacementValidationOk {
  readonly ok: true;
}

export interface VoxelBlockPlacementValidationErr {
  readonly ok: false;
  readonly errors: readonly string[];
}

export type VoxelBlockPlacementValidation =
  | VoxelBlockPlacementValidationOk
  | VoxelBlockPlacementValidationErr;

function blockPrefix(block: VoxelBlock): string {
  return `(${block.x},${block.y},${block.z}) ${block.blockTypeId}`;
}

/** Runs shape/state then material/shape checks; errors include lattice coords and block id. */
export function validateVoxelBlockPlacement(
  block: VoxelBlock,
): VoxelBlockPlacementValidation {
  const shapeResult = validateVoxelBlockShapeState(block);
  if (!shapeResult.ok) {
    return {
      ok: false,
      errors: shapeResult.errors.map(
        (e) => `${blockPrefix(block)} — shape/state: ${e}`,
      ),
    };
  }
  const materialResult = validateVoxelBlockMaterialShape(block);
  if (!materialResult.ok) {
    return {
      ok: false,
      errors: materialResult.errors.map(
        (e) => `${blockPrefix(block)} — material/shape: ${e}`,
      ),
    };
  }
  return { ok: true };
}

/** Validates every block in order; aggregates errors with coordinate context. */
export function validateVoxelStructurePlacements(
  structure: VoxelStructure,
): VoxelBlockPlacementValidation {
  const errors: string[] = [];
  for (const block of structure.blocks) {
    const r = validateVoxelBlockPlacement(block);
    if (!r.ok) errors.push(...r.errors);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
