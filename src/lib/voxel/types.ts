/**
 * Core voxel model types. Structures are lists of axis-aligned unit cubes on
 * an integer lattice (centers at whole coordinates).
 */

export type VoxelMaterialId = "stone" | "wood" | "glass" | "grass";

export interface VoxelBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly materialId: VoxelMaterialId;
}

export interface VoxelStructure {
  readonly blocks: readonly VoxelBlock[];
}

/** Stable draw order for grouping / InstancedMesh batches */
export const VOXEL_MATERIAL_ORDER: readonly VoxelMaterialId[] = [
  "grass",
  "stone",
  "wood",
  "glass",
] as const;

export interface VoxelMaterialVisual {
  readonly color: string;
  readonly metalness: number;
  readonly roughness: number;
  /** When set, passed to meshStandardMaterial */
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly depthWrite?: boolean;
}

export const VOXEL_MATERIAL_VISUAL: Record<
  VoxelMaterialId,
  VoxelMaterialVisual
> = {
  grass: { color: "#3f8f42", metalness: 0, roughness: 0.92 },
  stone: { color: "#7d8288", metalness: 0.06, roughness: 0.94 },
  wood: { color: "#7a4f2a", metalness: 0, roughness: 0.88 },
  glass: {
    color: "#a8ddff",
    metalness: 0.35,
    roughness: 0.12,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  },
};
