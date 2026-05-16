import { blockTypeId as makeBlockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { VoxelBlock, VoxelStructure } from "./types";

const grass = makeBlockTypeId("classic", "grass");
const stone = makeBlockTypeId("classic", "cobblestone");
const wood = makeBlockTypeId("classic", "oak_planks");
const glass = makeBlockTypeId("classic", "glass");

/**
 * Procedural sample: grass plinth, stone tower, wood corner caps, glass band
 * on the +Z face. Uses classic texture pack block types.
 */
function buildSampleTower(): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];

  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      blocks.push({ x, y: -1, z, blockTypeId: grass });
    }
  }

  for (let y = 0; y <= 5; y++) {
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        let blockTypeIdValue = stone;
        if (y >= 3 && y <= 4 && z === 2 && Math.abs(x) <= 1) {
          blockTypeIdValue = glass;
        }
        if (y === 5 && Math.abs(x) === 2 && Math.abs(z) === 2) {
          blockTypeIdValue = wood;
        }
        blocks.push({ x, y, z, blockTypeId: blockTypeIdValue });
      }
    }
  }

  return blocks;
}

export const SAMPLE_STRUCTURE: VoxelStructure = {
  blocks: buildSampleTower(),
};

/**
 * Minimal dev fixture: one cube, slab, pane, and post using the same material.
 * Not wired to the default viewer — use for manual inspection or tests.
 */
export const SAMPLE_PARTIAL_BLOCK_FOUNDATION: VoxelStructure = {
  blocks: [
    { x: 0, y: 0, z: 0, blockTypeId: stone },
    {
      x: 2,
      y: 0,
      z: 0,
      blockTypeId: stone,
      shapeKind: "slab",
      state: { half: "bottom" },
    },
    {
      x: 4,
      y: 0,
      z: 0,
      blockTypeId: stone,
      shapeKind: "pane",
      state: { axis: "x" },
    },
    {
      x: 6,
      y: 0,
      z: 0,
      blockTypeId: stone,
      shapeKind: "post",
    },
  ],
};
