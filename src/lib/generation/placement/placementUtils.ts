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

const OFFSETS26: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        out.push([dx, dy, dz]);
      }
    }
  }
  return out;
})();

/**
 * Drop blocks not 26-reachable from seeds at structure minY (matches structureAnalysis).
 * Use for component-plan merges so roof decks over hollow interiors stay connected.
 */
export function filterGroundedConnected26(
  blocks: readonly VoxelBlock[],
  allowFloating: boolean,
): VoxelBlock[] {
  if (allowFloating) return [...blocks];
  if (blocks.length === 0) return [];

  const occupied = new Set<string>();
  let minY = Infinity;
  for (const b of blocks) {
    occupied.add(placementCoordKey(b.x, b.y, b.z));
    minY = Math.min(minY, b.y);
  }

  const reachable = new Set<string>();
  const stack: string[] = [];
  for (const key of occupied) {
    const y = Number(key.split(",")[1]);
    if (y === minY) {
      reachable.add(key);
      stack.push(key);
    }
  }

  while (stack.length > 0) {
    const cur = stack.pop()!;
    const [x, y, z] = cur.split(",").map((s) => Number.parseInt(s, 10));
    for (const [dx, dy, dz] of OFFSETS26) {
      const nk = placementCoordKey(x + dx, y + dy, z + dz);
      if (occupied.has(nk) && !reachable.has(nk)) {
        reachable.add(nk);
        stack.push(nk);
      }
    }
  }

  return blocks.filter((b) =>
    reachable.has(placementCoordKey(b.x, b.y, b.z)),
  );
}

/** Drop blocks with only direct support at y-1 (legacy tower path). */
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
