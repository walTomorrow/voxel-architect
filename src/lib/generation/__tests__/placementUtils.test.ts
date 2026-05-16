import { describe, expect, test } from "vitest";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import {
  centerOrigin,
  filterGrounded,
  mergePlacements,
  type GeneratorPlacement,
} from "@/src/lib/generation/placement/placementUtils";

const STONE = blockTypeId("classic", "cobblestone");
const GLASS = blockTypeId("classic", "glass");

describe("placementUtils", () => {
  test("centerOrigin centers odd and even spans", () => {
    expect(centerOrigin(7)).toBe(-3);
    expect(centerOrigin(8)).toBe(-4);
  });

  test("mergePlacements keeps higher priority at same coordinate", () => {
    const pl: GeneratorPlacement[] = [
      { x: 0, y: 0, z: 0, p: 10, id: STONE, i: 0 },
      { x: 0, y: 0, z: 0, p: 20, id: GLASS, i: 1 },
    ];
    const blocks = mergePlacements(pl);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.blockTypeId).toBe(GLASS);
  });

  test("mergePlacements on equal priority keeps later insertion index", () => {
    const pl: GeneratorPlacement[] = [
      { x: 0, y: 0, z: 0, p: 20, id: GLASS, i: 1 },
      { x: 0, y: 0, z: 0, p: 20, id: STONE, i: 2 },
    ];
    const blocks = mergePlacements(pl);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.blockTypeId).toBe(STONE);
  });

  test("mergePlacements preserves shapeKind and state", () => {
    const pl: GeneratorPlacement[] = [
      {
        x: 1,
        y: 2,
        z: 3,
        p: 50,
        id: GLASS,
        i: 0,
        shapeKind: "pane",
        state: { axis: "x" },
      },
    ];
    const blocks = mergePlacements(pl);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.shapeKind).toBe("pane");
    expect(blocks[0]!.state).toEqual({ axis: "x" });
  });

  test("mergePlacements collapses duplicate coordinates to one block", () => {
    const pl: GeneratorPlacement[] = [
      { x: 2, y: 0, z: 2, p: 10, id: STONE, i: 0 },
      { x: 2, y: 0, z: 2, p: 5, id: STONE, i: 1 },
      { x: 3, y: 0, z: 3, p: 10, id: STONE, i: 2 },
    ];
    expect(mergePlacements(pl)).toHaveLength(2);
  });

  test("filterGrounded removes floating blocks when not allowed", () => {
    const blocks = filterGrounded(
      [
        { x: 0, y: 0, z: 0, blockTypeId: STONE },
        { x: 2, y: 2, z: 0, blockTypeId: STONE },
      ],
      false,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.x).toBe(0);
  });
});
