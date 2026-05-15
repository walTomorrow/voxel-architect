import { describe, expect, test } from "vitest";

import type { BlockTypeId } from "../blocks/registry-types";
import { analyzeVoxelStructure, voxelPositionKey } from "../structureAnalysis";

const STONE = "classic/cobblestone" as BlockTypeId;

describe("analyzeVoxelStructure", () => {
  test("empty structure yields null bounds and zero connectivity", () => {
    const r = analyzeVoxelStructure([]);
    expect(r.bounds).toBeNull();
    expect(r.blockCount).toBe(0);
    expect(r.uniqueBlockCount).toBe(0);
    expect(r.connectedComponentCount26).toBe(0);
    expect(r.allBlocksGroundedConnected26).toBe(false);
  });

  test("voxelPositionKey matches lattice string convention", () => {
    expect(voxelPositionKey(1, -2, 3)).toBe("1,-2,3");
  });

  test("face-adjacent occupied cells are one 26-neighbor component and grounded", () => {
    const r = analyzeVoxelStructure([
      { x: 0, y: 0, z: 0, blockTypeId: STONE },
      { x: 1, y: 0, z: 0, blockTypeId: STONE },
    ]);
    expect(r.connectedComponentCount26).toBe(1);
    expect(r.largestComponentSize26).toBe(2);
    expect(r.groundTouchingBlockCount).toBe(2);
    expect(r.groundedReachableBlockCount26).toBe(2);
    expect(r.ungroundedBlockCount26).toBe(0);
    expect(r.allBlocksGroundedConnected26).toBe(true);
  });

  test("corner/diagonal contact counts as adjacent under 26-neighbor adjacency", () => {
    const r = analyzeVoxelStructure([
      { x: 0, y: 0, z: 0, blockTypeId: STONE },
      { x: 1, y: 1, z: 0, blockTypeId: STONE },
    ]);
    expect(r.connectedComponentCount26).toBe(1);
    expect(r.bounds?.minY).toBe(0);
    expect(r.allBlocksGroundedConnected26).toBe(true);
  });

  test("detached cluster is disconnected and ungrounded cells are reported", () => {
    const r = analyzeVoxelStructure([
      { x: 0, y: 0, z: 0, blockTypeId: STONE },
      { x: 10, y: 10, z: 10, blockTypeId: STONE },
    ]);
    expect(r.connectedComponentCount26).toBe(2);
    expect(r.ungroundedBlockCount26).toBe(1);
    expect(r.groundedReachableBlockCount26).toBe(1);
    expect(r.allBlocksGroundedConnected26).toBe(false);
    expect(r.bounds?.minY).toBe(0);
  });

  test("duplicate coordinates are counted and duplicateCoordinates is sorted lex by coords", () => {
    const r = analyzeVoxelStructure([
      { x: 1, y: 0, z: 0, blockTypeId: STONE },
      { x: 1, y: 0, z: 0, blockTypeId: STONE },
      { x: 0, y: 0, z: 0, blockTypeId: STONE },
    ]);
    expect(r.duplicateCoordinateCount).toBe(1);
    expect(r.uniqueBlockCount).toBe(2);
    expect(r.duplicateCoordinates).toEqual(["1,0,0"]);
    expect(r.blockTypeCounts[STONE]).toBe(3);
    expect(r.allBlocksGroundedConnected26).toBe(true);
  });

  test("unknown block types are detected and invalidBlockTypeIds is sorted", () => {
    const badA = "classic/not-a-real-block-type-xx" as BlockTypeId;
    const badB = "zzz/bogus-after-classic-sort" as BlockTypeId;

    const r = analyzeVoxelStructure([
      { x: 0, y: 0, z: 0, blockTypeId: badB },
      { x: 0, y: 0, z: 1, blockTypeId: badA },
    ]);

    expect(r.invalidBlockTypeIds).toEqual([badA, badB]);
    expect(r.connectedComponentCount26).toBe(1);
  });
});
