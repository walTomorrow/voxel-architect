/**
 * Pure lattice analysis for generated voxel structures — no React / Three.js.
 *
 * - Coordinate keys `${x},${y},${z}` match generator conventions for stable maps.
 * - Connectivity uses 26-neighbor adjacency on **unique occupied cells**.
 * - Duplicates in the block list are counted separately (`duplicate*` fields).
 * - Optional `shapeKind` / `state` do not affect occupancy, duplicates, or
 *   connectivity — only integer coordinates `(x, y, z)` matter.
 *
 * Grounding: seeds are unique cells with `y === minY` where `minY` is computed
 * from unique coordinates. Reachability uses the same 26-neighbor adjacency as
 * component analysis. (Typical medieval tower output has `minY === 0`.)
 */

import type { BlockTypeId } from "./blocks/registry-types";
import { getBlockDefinition } from "./blocks/registry";
import type { VoxelBlock } from "./types";

const DUPLICATE_COORDINATES_CAP = 20;

/** Offsets dx, dy, dz ∈ {-1,0,1}³ \ {(0,0,0)} */
const OFFSETS26: readonly (readonly [number, number, number])[] =
  buildOffsets26();

function buildOffsets26(): readonly [number, number, number][] {
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
}

export function voxelPositionKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function parsePositionKey(key: string): readonly [number, number, number] {
  const parts = key.split(",");
  if (parts.length !== 3) {
    throw new Error(`structureAnalysis: invalid position key "${key}"`);
  }
  return [
    Number(parts[0]),
    Number(parts[1]),
    Number(parts[2]),
  ] as const;
}

function compareLexKeys(a: string, b: string): number {
  const pa = parsePositionKey(a);
  const pb = parsePositionKey(b);
  if (pa[0] !== pb[0]) return pa[0] - pb[0];
  if (pa[1] !== pb[1]) return pa[1] - pb[1];
  return pa[2] - pb[2];
}

export interface VoxelStructureBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface VoxelStructureAnalysis {
  readonly blockCount: number;
  readonly uniqueBlockCount: number;
  readonly bounds: VoxelStructureBounds | null;
  readonly duplicateCoordinateCount: number;
  /** Sorted unique keys where more than one block shares the lattice cell */
  readonly duplicateCoordinates: readonly string[];
  readonly blockTypeCounts: Readonly<Record<string, number>>;
  readonly invalidBlockTypeIds: readonly BlockTypeId[];
  readonly groundTouchingBlockCount: number;
  readonly connectedComponentCount26: number;
  readonly largestComponentSize26: number;
  readonly groundedReachableBlockCount26: number;
  readonly ungroundedBlockCount26: number;
  /**
   * True when there is occupancy, a single 26-component, and everything is
   * 26-reachable from seeds at `y === minY`. Convenience only — tests decide pass/fail.
   */
  readonly allBlocksGroundedConnected26: boolean;
}

export function analyzeVoxelStructure(
  blocks: readonly VoxelBlock[],
): VoxelStructureAnalysis {
  const blockCount = blocks.length;

  if (blockCount === 0) {
    return {
      blockCount: 0,
      uniqueBlockCount: 0,
      bounds: null,
      duplicateCoordinateCount: 0,
      duplicateCoordinates: [],
      blockTypeCounts: {},
      invalidBlockTypeIds: [],
      groundTouchingBlockCount: 0,
      connectedComponentCount26: 0,
      largestComponentSize26: 0,
      groundedReachableBlockCount26: 0,
      ungroundedBlockCount26: 0,
      allBlocksGroundedConnected26: false,
    };
  }

  const perCellCount = new Map<string, number>();
  const invalidIdSet = new Set<BlockTypeId>();
  const blockTypeCounts: Record<string, number> = {};

  for (const b of blocks) {
    const k = voxelPositionKey(b.x, b.y, b.z);
    perCellCount.set(k, (perCellCount.get(k) ?? 0) + 1);

    const cur = blockTypeCounts[b.blockTypeId] ?? 0;
    blockTypeCounts[b.blockTypeId] = cur + 1;

    if (getBlockDefinition(b.blockTypeId) === undefined) {
      invalidIdSet.add(b.blockTypeId);
    }
  }

  const uniqueKeys = [...perCellCount.keys()].sort(compareLexKeys);
  const uniqueBlockCount = uniqueKeys.length;

  let duplicateCoordinateCount = 0;
  const duplicateKeysFull: string[] = [];
  for (const key of uniqueKeys) {
    const c = perCellCount.get(key) ?? 0;
    if (c > 1) {
      duplicateKeysFull.push(key);
      duplicateCoordinateCount += c - 1;
    }
  }
  const duplicateCoordinates = duplicateKeysFull.slice(0, DUPLICATE_COORDINATES_CAP);

  const invalidBlockTypeIds = [...invalidIdSet].sort((a, b) =>
    a.localeCompare(b),
  );

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  const occupied = new Set<string>(uniqueKeys);
  for (const key of uniqueKeys) {
    const [x, y, z] = parsePositionKey(key);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const bounds: VoxelStructureBounds = {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
  };

  let groundTouchingBlockCount = 0;
  for (const key of uniqueKeys) {
    const [, y] = parsePositionKey(key);
    if (y === minY) groundTouchingBlockCount++;
  }

  const componentSizes = findComponentSizes26(occupied);

  let connectedComponentCount26 = componentSizes.length;
  let largestComponentSize26 =
    connectedComponentCount26 === 0
      ? 0
      : Math.max(...componentSizes);

  const groundedReachable = countGroundedReachable26(
    occupied,
    bounds.minY,
  );
  const groundedReachableBlockCount26 = groundedReachable.size;
  const ungroundedBlockCount26 =
    uniqueBlockCount - groundedReachableBlockCount26;

  const allBlocksGroundedConnected26 =
    uniqueBlockCount > 0 &&
    ungroundedBlockCount26 === 0 &&
    connectedComponentCount26 === 1;

  return {
    blockCount,
    uniqueBlockCount,
    bounds,
    duplicateCoordinateCount,
    duplicateCoordinates,
    blockTypeCounts,
    invalidBlockTypeIds,
    groundTouchingBlockCount,
    connectedComponentCount26,
    largestComponentSize26,
    groundedReachableBlockCount26,
    ungroundedBlockCount26,
    allBlocksGroundedConnected26,
  };
}

function neighbors26Keys(key: string, occupied: Set<string>): string[] {
  const [x, y, z] = parsePositionKey(key);
  const next: string[] = [];
  for (const [dx, dy, dz] of OFFSETS26) {
    const nk = voxelPositionKey(x + dx, y + dy, z + dz);
    if (occupied.has(nk)) next.push(nk);
  }
  return next;
}

function findComponentSizes26(occupied: Set<string>): number[] {
  const visited = new Set<string>();
  const sizes: number[] = [];

  for (const start of occupied) {
    if (visited.has(start)) continue;
    const stack = [start];
    visited.add(start);
    let size = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      size++;
      for (const nk of neighbors26Keys(cur, occupied)) {
        if (!visited.has(nk)) {
          visited.add(nk);
          stack.push(nk);
        }
      }
    }
    sizes.push(size);
  }
  return sizes;
}

function countGroundedReachable26(
  occupied: Set<string>,
  minY: number,
): Set<string> {
  const reachable = new Set<string>();
  const stack: string[] = [];

  for (const key of occupied) {
    const [, y] = parsePositionKey(key);
    if (y === minY) {
      stack.push(key);
      reachable.add(key);
    }
  }

  while (stack.length) {
    const cur = stack.pop()!;
    for (const nk of neighbors26Keys(cur, occupied)) {
      if (!reachable.has(nk)) {
        reachable.add(nk);
        stack.push(nk);
      }
    }
  }
  return reachable;
}
