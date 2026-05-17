import { describe, expect, test } from "vitest";

import { blockTypeId, getBlockDefinition } from "../blocks/registry";
import { validateVoxelBlockMaterialShape } from "../blocks/materialMetaHelpers";
import { analyzeVoxelStructure } from "../structureAnalysis";
import type { VoxelBlock } from "../types";
import { PARTIAL_BLOCK_SHOWCASE_STRUCTURE } from "../sampleStructure";
import { validateVoxelBlockShapeState } from "../voxelBlockShape";
import {
  validateVoxelBlockPlacement,
  validateVoxelStructurePlacements,
} from "../voxelBlockPlacement";

function hasCube(blocks: readonly VoxelBlock[]): boolean {
  return blocks.some((b) => (b.shapeKind ?? "cube") === "cube");
}

function hasSlabHalf(blocks: readonly VoxelBlock[], half: "top" | "bottom"): boolean {
  return blocks.some(
    (b) =>
      b.shapeKind === "slab" &&
      b.state?.half === half,
  );
}

function hasPaneAxis(blocks: readonly VoxelBlock[], axis: "x" | "z"): boolean {
  return blocks.some(
    (b) => b.shapeKind === "pane" && b.state?.axis === axis,
  );
}

function hasPost(blocks: readonly VoxelBlock[]): boolean {
  return blocks.some((b) => b.shapeKind === "post");
}

describe("PARTIAL_BLOCK_SHOWCASE_STRUCTURE", () => {
  test("exists and is non-empty", () => {
    expect(PARTIAL_BLOCK_SHOWCASE_STRUCTURE.blocks.length).toBeGreaterThan(0);
  });

  test("includes cube, slab bottom/top, pane x/z, and post variants", () => {
    const { blocks } = PARTIAL_BLOCK_SHOWCASE_STRUCTURE;
    expect(hasCube(blocks)).toBe(true);
    expect(hasSlabHalf(blocks, "bottom")).toBe(true);
    expect(hasSlabHalf(blocks, "top")).toBe(true);
    expect(hasPaneAxis(blocks, "x")).toBe(true);
    expect(hasPaneAxis(blocks, "z")).toBe(true);
    expect(hasPost(blocks)).toBe(true);
  });

  test("every block passes shape/state validation", () => {
    for (const b of PARTIAL_BLOCK_SHOWCASE_STRUCTURE.blocks) {
      expect(validateVoxelBlockShapeState(b)).toEqual({ ok: true });
    }
  });

  test("every block passes material/shape validation", () => {
    for (const b of PARTIAL_BLOCK_SHOWCASE_STRUCTURE.blocks) {
      expect(validateVoxelBlockMaterialShape(b)).toEqual({ ok: true });
    }
  });

  test("every block passes combined placement validation", () => {
    for (const b of PARTIAL_BLOCK_SHOWCASE_STRUCTURE.blocks) {
      expect(validateVoxelBlockPlacement(b)).toEqual({ ok: true });
    }
    expect(
      validateVoxelStructurePlacements(PARTIAL_BLOCK_SHOWCASE_STRUCTURE),
    ).toEqual({ ok: true });
  });

  test("no duplicate coordinates", () => {
    const a = analyzeVoxelStructure(PARTIAL_BLOCK_SHOWCASE_STRUCTURE.blocks);
    expect(a.duplicateCoordinateCount).toBe(0);
    expect(a.duplicateCoordinates.length).toBe(0);
  });

  test("every blockTypeId resolves in registry", () => {
    for (const b of PARTIAL_BLOCK_SHOWCASE_STRUCTURE.blocks) {
      expect(getBlockDefinition(b.blockTypeId)).toBeDefined();
    }
  });
});

describe("validateVoxelBlockPlacement", () => {
  test("rejects structurally invalid block", () => {
    const r = validateVoxelBlockPlacement({
      x: 0,
      y: 0,
      z: 0,
      blockTypeId: blockTypeId("classic", "cobblestone"),
      shapeKind: "pane",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes("shape/state"))).toBe(true);
      expect(r.errors.some((e) => e.includes("(0,0,0)"))).toBe(true);
    }
  });

  test("rejects materially invalid shape combination", () => {
    const r = validateVoxelBlockPlacement({
      x: 1,
      y: 2,
      z: 3,
      blockTypeId: blockTypeId("classic", "oak_log"),
      shapeKind: "slab",
      state: { half: "bottom" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes("material/shape"))).toBe(true);
      expect(r.errors.some((e) => e.includes("(1,2,3)"))).toBe(true);
    }
  });
});
