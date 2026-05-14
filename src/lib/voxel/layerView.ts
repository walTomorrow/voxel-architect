import type { VoxelBlock } from "@/src/lib/voxel/types";

export type LayerViewMode = "full" | "build-up" | "slice";

/** Min/max block `y` from actual voxels (raw lattice y; not viewer `GROUP_Y_SHIFT`). */
export function computeLayerYExtents(
  blocks: readonly VoxelBlock[],
): { yMin: number; yMax: number } | null {
  if (blocks.length === 0) return null;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const b of blocks) {
    yMin = Math.min(yMin, b.y);
    yMax = Math.max(yMax, b.y);
  }
  return { yMin, yMax };
}

export function filterBlocksForLayerView(
  blocks: readonly VoxelBlock[],
  mode: LayerViewMode,
  selectedLayer: number,
): readonly VoxelBlock[] {
  switch (mode) {
    case "full":
      return blocks;
    case "build-up":
      return blocks.filter((b) => b.y <= selectedLayer);
    case "slice":
      return blocks.filter((b) => b.y === selectedLayer);
    default:
      return blocks;
  }
}

export function clampLayerY(
  y: number,
  ext: { yMin: number; yMax: number },
): number {
  if (!Number.isFinite(y)) return ext.yMin;
  return Math.min(ext.yMax, Math.max(ext.yMin, Math.round(y)));
}
