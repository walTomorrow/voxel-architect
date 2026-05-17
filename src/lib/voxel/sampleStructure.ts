import { blockTypeId as makeBlockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { VoxelBlock, VoxelStructure } from "./types";

const stone = makeBlockTypeId("classic", "cobblestone");
const glass = makeBlockTypeId("classic", "glass");

const cobble = stone;
const oakLog = makeBlockTypeId("classic", "oak_log");
const oakPlanks = makeBlockTypeId("classic", "oak_planks");
const limestoneBricks = makeBlockTypeId("classic", "limestone_bricks");
const slateTiles = makeBlockTypeId("classic", "slate_tiles");

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
