import { describe, expect, test } from "vitest";

import { blockTypeId } from "../blocks/registry";
import type { BlockTypeId } from "../blocks/registry-types";
import {
  isShapeAllowedForBlockType,
  validateVoxelBlockMaterialShape,
} from "../blocks/materialMetaHelpers";
import { validateVoxelBlockShapeState } from "../voxelBlockShape";

const OAK_PLANKS = blockTypeId("classic", "oak_planks");
const OAK_LOG = blockTypeId("classic", "oak_log");
const GLASS = blockTypeId("classic", "glass");
const SLATE_TILES = blockTypeId("classic", "slate_tiles");
const ANDESITE = blockTypeId("classic", "andesite");
const GRAVEL = blockTypeId("classic", "gravel");
const UNKNOWN = "classic/__nonexistent_block__" as BlockTypeId;

describe("material meta helpers", () => {
  test("oak_planks allows cube, slab, post", () => {
    expect(isShapeAllowedForBlockType(OAK_PLANKS, "cube")).toBe(true);
    expect(isShapeAllowedForBlockType(OAK_PLANKS, "slab")).toBe(true);
    expect(isShapeAllowedForBlockType(OAK_PLANKS, "post")).toBe(true);
    expect(isShapeAllowedForBlockType(OAK_PLANKS, "pane")).toBe(false);
  });

  test("oak_log allows cube and post but not pane", () => {
    expect(isShapeAllowedForBlockType(OAK_LOG, "cube")).toBe(true);
    expect(isShapeAllowedForBlockType(OAK_LOG, "post")).toBe(true);
    expect(isShapeAllowedForBlockType(OAK_LOG, "pane")).toBe(false);
    expect(isShapeAllowedForBlockType(OAK_LOG, "slab")).toBe(false);
  });

  test("glass allows cube and pane but not slab or post", () => {
    expect(isShapeAllowedForBlockType(GLASS, "cube")).toBe(true);
    expect(isShapeAllowedForBlockType(GLASS, "pane")).toBe(true);
    expect(isShapeAllowedForBlockType(GLASS, "slab")).toBe(false);
    expect(isShapeAllowedForBlockType(GLASS, "post")).toBe(false);
  });

  test("slate_tiles allows cube and slab only", () => {
    expect(isShapeAllowedForBlockType(SLATE_TILES, "cube")).toBe(true);
    expect(isShapeAllowedForBlockType(SLATE_TILES, "slab")).toBe(true);
    expect(isShapeAllowedForBlockType(SLATE_TILES, "post")).toBe(false);
    expect(isShapeAllowedForBlockType(SLATE_TILES, "pane")).toBe(false);
  });

  test("andesite allows cube and slab (classic stone masonry metadata)", () => {
    expect(isShapeAllowedForBlockType(ANDESITE, "cube")).toBe(true);
    expect(isShapeAllowedForBlockType(ANDESITE, "slab")).toBe(true);
    expect(isShapeAllowedForBlockType(ANDESITE, "post")).toBe(false);
    expect(isShapeAllowedForBlockType(ANDESITE, "pane")).toBe(false);
  });

  test("unannotated classic block allows cube only for partial shapes", () => {
    expect(isShapeAllowedForBlockType(GRAVEL, "cube")).toBe(true);
    expect(isShapeAllowedForBlockType(GRAVEL, "slab")).toBe(false);
    expect(isShapeAllowedForBlockType(GRAVEL, "post")).toBe(false);
    expect(isShapeAllowedForBlockType(GRAVEL, "pane")).toBe(false);
  });

  test("unknown blockTypeId does not allow shapes (including cube)", () => {
    expect(isShapeAllowedForBlockType(UNKNOWN, "cube")).toBe(false);
    expect(isShapeAllowedForBlockType(UNKNOWN, "slab")).toBe(false);
  });

  test("validateVoxelBlockMaterialShape ok for allowed material/shape pairs", () => {
    const slabOk = validateVoxelBlockMaterialShape({
      x: 0,
      y: 0,
      z: 0,
      blockTypeId: OAK_PLANKS,
      shapeKind: "slab",
      state: { half: "bottom" },
    });
    expect(slabOk).toEqual({ ok: true });
  });

  test("validateVoxelBlockMaterialShape invalid for disallowed pairs", () => {
    const r = validateVoxelBlockMaterialShape({
      x: 0,
      y: 0,
      z: 0,
      blockTypeId: GRAVEL,
      shapeKind: "slab",
      state: { half: "bottom" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes("cube-only fallback"))).toBe(true);
    }
  });

  test("glass pane without axis: materially allowed; shape/state still invalid separately", () => {
    const glassPaneNoAxis = {
      x: 0,
      y: 0,
      z: 0,
      blockTypeId: GLASS,
      shapeKind: "pane" as const,
    };
    expect(validateVoxelBlockMaterialShape(glassPaneNoAxis)).toEqual({ ok: true });
    expect(validateVoxelBlockShapeState(glassPaneNoAxis)).toMatchObject({ ok: false });
  });
});
