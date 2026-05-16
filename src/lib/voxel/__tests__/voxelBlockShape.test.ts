import { describe, expect, test } from "vitest";

import { analyzeVoxelStructure } from "../structureAnalysis";
import type { BlockTypeId } from "../blocks/registry-types";
import type { VoxelBlock } from "../types";
import {
  getVoxelBlockRenderBucketKey,
  normalizeVoxelBlockShapeKind,
  validateVoxelBlockShapeState,
} from "../voxelBlockShape";

const STONE = "classic/cobblestone" as BlockTypeId;

describe("voxelBlockShape helpers", () => {
  test("omitted shapeKind normalizes to cube", () => {
    const b = { x: 0, y: 0, z: 0, blockTypeId: STONE };
    expect(normalizeVoxelBlockShapeKind(b)).toBe("cube");
  });

  test("cube is valid without state", () => {
    expect(validateVoxelBlockShapeState({ x: 0, y: 0, z: 0, blockTypeId: STONE })).toEqual({
      ok: true,
    });
    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "cube",
      }),
    ).toEqual({ ok: true });
  });

  test("slab requires valid half", () => {
    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "slab",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "slab",
        state: { half: "bottom" },
      }),
    ).toEqual({ ok: true });

    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "slab",
        state: { half: "top", axis: "x" },
      }),
    ).toMatchObject({ ok: false });
  });

  test("pane requires valid axis", () => {
    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "pane",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "pane",
        state: { axis: "z" },
      }),
    ).toEqual({ ok: true });
  });

  test("post is valid without state", () => {
    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "post",
      }),
    ).toEqual({ ok: true });
  });

  test("invalid shape/state combinations", () => {
    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "cube",
        state: { half: "bottom" },
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "post",
        state: { half: "bottom" },
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateVoxelBlockShapeState({
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "door",
      } as unknown as VoxelBlock),
    ).toMatchObject({ ok: false });
  });

  test("render bucket keys distinguish shape variants", () => {
    const cube = { x: 0, y: 0, z: 0, blockTypeId: STONE };
    const slab = {
      ...cube,
      shapeKind: "slab" as const,
      state: { half: "bottom" as const },
    };
    expect(getVoxelBlockRenderBucketKey(cube)).toBe(`${STONE}|cube`);
    expect(getVoxelBlockRenderBucketKey(slab)).toBe(`${STONE}|slab|bottom`);
  });
});

describe("analyzeVoxelStructure with partial blocks", () => {
  test("duplicate coordinates ignore shape/state differences", () => {
    const r = analyzeVoxelStructure([
      { x: 0, y: 0, z: 0, blockTypeId: STONE },
      {
        x: 0,
        y: 0,
        z: 0,
        blockTypeId: STONE,
        shapeKind: "slab",
        state: { half: "top" },
      },
    ]);
    expect(r.duplicateCoordinateCount).toBe(1);
    expect(r.duplicateCoordinates).toContain("0,0,0");
    expect(r.uniqueBlockCount).toBe(1);
  });
});
