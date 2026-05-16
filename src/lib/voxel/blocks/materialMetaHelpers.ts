/**
 * Pure helpers for companion **`MaterialMeta`** — orthogonal to **`validateVoxelBlockShapeState`**
 * (structure/state). Combine both when generators validate placements end-to-end.
 */

import type { MaterialMeta } from "./materialMetaTypes";
import type { BlockTypeId } from "./registry-types";
import { getBlockDefinition } from "./registry";
import { CLASSIC_MATERIAL_META } from "./packs/classicMaterialMeta";
import type { VoxelBlock } from "../types";
import type { VoxelBlockShapeKind } from "../types";
import { normalizeVoxelBlockShapeKind } from "../voxelBlockShape";

export interface MaterialShapeValidationOk {
  readonly ok: true;
}

export interface MaterialShapeValidationErr {
  readonly ok: false;
  readonly errors: readonly string[];
}

export type MaterialShapeValidation = MaterialShapeValidationOk | MaterialShapeValidationErr;

/** Metadata row for a **`classic/<localKey>`** entry, if annotated. */
export function getClassicMaterialMeta(localKey: string): MaterialMeta | undefined {
  return CLASSIC_MATERIAL_META[localKey];
}

/** Resolve companion metadata for **`classic`** pack only; other packs ⇒ `undefined`. */
export function getMaterialMetaForBlockTypeId(
  blockTypeId: BlockTypeId,
): MaterialMeta | undefined {
  const slash = blockTypeId.indexOf("/");
  if (slash <= 0) return undefined;
  const packId = blockTypeId.slice(0, slash);
  if (packId !== "classic") return undefined;
  return getClassicMaterialMeta(blockTypeId.slice(slash + 1));
}

/**
 * Whether **`shapeKind`** is permitted for this **`blockTypeId`** given companion metadata.
 * - **`cube`**: allowed iff **`getBlockDefinition`** resolves (registry exists).
 * - Non-cube: requires an annotated **`allowedShapeKinds`** listing that shape.
 */
export function isShapeAllowedForBlockType(
  blockTypeId: BlockTypeId,
  shapeKind: VoxelBlockShapeKind,
): boolean {
  const def = getBlockDefinition(blockTypeId);
  if (!def) return false;
  if (shapeKind === "cube") return true;
  const meta = getMaterialMetaForBlockTypeId(blockTypeId);
  if (!meta) return false;
  return meta.allowedShapeKinds.includes(shapeKind);
}

/** Semantic material × placement shape (does not validate **`state`** fields). */
export function validateVoxelBlockMaterialShape(
  block: VoxelBlock,
): MaterialShapeValidation {
  const shape = normalizeVoxelBlockShapeKind(block);
  if (isShapeAllowedForBlockType(block.blockTypeId, shape)) {
    return { ok: true };
  }
  const meta = getMaterialMetaForBlockTypeId(block.blockTypeId);
  const def = getBlockDefinition(block.blockTypeId);
  if (!def) {
    return {
      ok: false,
      errors: [`Unknown blockTypeId: ${block.blockTypeId}`],
    };
  }
  if (!meta) {
    return {
      ok: false,
      errors: [
        `Shape "${shape}" not allowed for ${block.blockTypeId}: no material metadata (cube-only fallback)`,
      ],
    };
  }
  return {
    ok: false,
    errors: [
      `Shape "${shape}" not allowed for ${block.blockTypeId}; allowed: ${meta.allowedShapeKinds.join(", ")}`,
    ],
  };
}

// Re-export type for consumers that import helpers only
export type { MaterialMeta } from "./materialMetaTypes";
