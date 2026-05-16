import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type {
  VoxelBlock,
  VoxelBlockShapeKind,
  VoxelBlockState,
} from "@/src/lib/voxel/types";

/** Staging row for deterministic merge (priority + insertion order). */
export type GeneratorPlacement = {
  x: number;
  y: number;
  z: number;
  p: number;
  id: BlockTypeId;
  i: number;
  shapeKind?: VoxelBlockShapeKind;
  state?: VoxelBlockState;
};

export function placementCoordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function centerOrigin(n: number): number {
  return -Math.floor(n / 2);
}

/**
 * Deterministic merge: higher priority wins first; first placement kept per voxel.
 * Sort: descending `p`, then descending insertion index `i`.
 */
export function mergePlacements(
  placements: GeneratorPlacement[],
): VoxelBlock[] {
  placements.sort((a, b) => b.p - a.p || b.i - a.i);
  const seen = new Set<string>();
  const out: VoxelBlock[] = [];
  for (const q of placements) {
    const k = placementCoordKey(q.x, q.y, q.z);
    if (seen.has(k)) continue;
    seen.add(k);
    const block: VoxelBlock =
      q.shapeKind !== undefined
        ? {
            x: q.x,
            y: q.y,
            z: q.z,
            blockTypeId: q.id,
            shapeKind: q.shapeKind,
            ...(q.state !== undefined ? { state: q.state } : {}),
          }
        : { x: q.x, y: q.y, z: q.z, blockTypeId: q.id };
    out.push(block);
  }
  return out;
}

/** Drop blocks not 26-connected to y ≤ 0 through downward neighbors (structure-relative). */
export function filterGrounded(
  blocks: readonly VoxelBlock[],
  allowFloating: boolean,
): VoxelBlock[] {
  if (allowFloating) return [...blocks];
  const sorted = [...blocks].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.z - b.z,
  );
  const grounded = new Set<string>();
  const out: VoxelBlock[] = [];
  for (const b of sorted) {
    const k = placementCoordKey(b.x, b.y, b.z);
    if (
      b.y <= 0 ||
      grounded.has(placementCoordKey(b.x, b.y - 1, b.z))
    ) {
      grounded.add(k);
      out.push(b);
    }
  }
  return out;
}
