/**
 * Core voxel model types. Structures are lists of axis-aligned unit cubes on
 * an integer lattice (centers at whole coordinates).
 */

import type { BlockTypeId } from "./blocks/registry-types";

export interface VoxelBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Semantic id from the block registry, e.g. `classic/cobblestone` */
  readonly blockTypeId: BlockTypeId;
}

export interface VoxelStructure {
  readonly blocks: readonly VoxelBlock[];
}
