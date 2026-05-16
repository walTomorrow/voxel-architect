/**
 * Core voxel model types. Structures are lists of placements on an integer lattice
 * (block centers at whole coordinates). Default shape is a full unit cube; optional
 * `shapeKind` / `state` select partial shapes rendered inside the same cell.
 */

import type { BlockTypeId } from "./blocks/registry-types";

/** Supported placement shapes for the partial-block foundation slice. */
export type VoxelBlockShapeKind = "cube" | "slab" | "pane" | "post";

/** Orientation / half-cell state; does not affect lattice occupancy (x/y/z). */
export interface VoxelBlockState {
  /** Slab vertical half (required when `shapeKind === "slab"`). */
  readonly half?: "top" | "bottom";
  /** Pane thin-axis in the horizontal plane (required when `shapeKind === "pane"`). */
  readonly axis?: "x" | "z";
}

export interface VoxelBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Semantic id from the block registry, e.g. `classic/cobblestone` */
  readonly blockTypeId: BlockTypeId;
  /**
   * Placement shape; omit or `"cube"` for a full unit cube (legacy behavior).
   */
  readonly shapeKind?: VoxelBlockShapeKind;
  /** Geometry hints; requirements depend on `shapeKind` (see voxelBlockShape helpers). */
  readonly state?: VoxelBlockState;
}

export interface VoxelStructure {
  readonly blocks: readonly VoxelBlock[];
}
