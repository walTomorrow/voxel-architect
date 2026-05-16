import { blockTypeId as makeBlockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { VoxelBlock, VoxelStructure } from "./types";

const grass = makeBlockTypeId("classic", "grass");
const stone = makeBlockTypeId("classic", "cobblestone");
const wood = makeBlockTypeId("classic", "oak_planks");
const glass = makeBlockTypeId("classic", "glass");

const cobble = stone;
const oakLog = makeBlockTypeId("classic", "oak_log");
const oakPlanks = wood;
const limestoneBricks = makeBlockTypeId("classic", "limestone_bricks");
const slateTiles = makeBlockTypeId("classic", "slate_tiles");

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
 * See **`PARTIAL_BLOCK_SHOWCASE_STRUCTURE`** for multi-material partial demo.
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

/**
 * Compact hand-authored vignette for **`/preview`** “Partial block showcase” mode.
 * Uses only annotated classic materials × allowed partial shapes (validated in tests).
 */
function buildPartialBlockShowcase(): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];

  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      blocks.push({ x, y: 0, z, blockTypeId: cobble });
    }
  }
  blocks.push({
    x: 3,
    y: 0,
    z: 1,
    blockTypeId: cobble,
    shapeKind: "slab",
    state: { half: "bottom" },
  });

  blocks.push(
    { x: -1, y: 1, z: -1, blockTypeId: oakLog, shapeKind: "post" },
    { x: 1, y: 1, z: -1, blockTypeId: oakLog, shapeKind: "post" },
    { x: -1, y: 1, z: 1, blockTypeId: oakLog, shapeKind: "post" },
    { x: 1, y: 1, z: 1, blockTypeId: oakLog, shapeKind: "post" },
    {
      x: 0,
      y: 1,
      z: 1,
      blockTypeId: oakPlanks,
      shapeKind: "slab",
      state: { half: "bottom" },
    },
    {
      x: 0,
      y: 1,
      z: -1,
      blockTypeId: oakPlanks,
      shapeKind: "slab",
      state: { half: "top" },
    },
    { x: 0, y: 1, z: 0, blockTypeId: limestoneBricks },
    {
      x: -2,
      y: 1,
      z: 0,
      blockTypeId: glass,
      shapeKind: "pane",
      state: { axis: "x" },
    },
    {
      x: 0,
      y: 1,
      z: -2,
      blockTypeId: glass,
      shapeKind: "pane",
      state: { axis: "z" },
    },
    { x: 2, y: 1, z: 0, blockTypeId: oakLog },
    { x: -2, y: 1, z: 2, blockTypeId: glass },
    { x: 3, y: 1, z: 0, blockTypeId: cobble, shapeKind: "post" },
    {
      x: 2,
      y: 1,
      z: 1,
      blockTypeId: limestoneBricks,
      shapeKind: "slab",
      state: { half: "bottom" },
    },
  );

  blocks.push({
    x: 0,
    y: 2,
    z: 0,
    blockTypeId: slateTiles,
    shapeKind: "slab",
    state: { half: "top" },
  });

  return blocks;
}

export const PARTIAL_BLOCK_SHOWCASE_STRUCTURE: VoxelStructure = {
  blocks: buildPartialBlockShowcase(),
};
