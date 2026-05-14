import type { VoxelBlock, VoxelMaterialId, VoxelStructure } from "./types";

/**
 * Procedural sample: grass plinth, stone tower, wood corner caps, glass band
 * on the +Z face. Intended as a fixed demo for the renderer milestone.
 */
function buildSampleTower(): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];

  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      blocks.push({ x, y: -1, z, materialId: "grass" });
    }
  }

  for (let y = 0; y <= 5; y++) {
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        let materialId: VoxelMaterialId = "stone";
        if (y >= 3 && y <= 4 && z === 2 && Math.abs(x) <= 1) {
          materialId = "glass";
        }
        if (y === 5 && Math.abs(x) === 2 && Math.abs(z) === 2) {
          materialId = "wood";
        }
        blocks.push({ x, y, z, materialId });
      }
    }
  }

  return blocks;
}

export const SAMPLE_STRUCTURE: VoxelStructure = {
  blocks: buildSampleTower(),
};
