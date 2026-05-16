import { describe, expect, test } from "vitest";

import {
  DEFAULT_MEDIEVAL_PRESET_ID,
  getMedievalTowerPreset,
} from "@/src/lib/blueprints/sampleBlueprints";
import type { MedievalTowerBlueprint } from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { paneAxisForWindowCell } from "@/src/lib/generation/generators/generateMedievalTower";
import { EDGE_CASE_BLUEPRINT_FIXTURES } from "@/src/lib/generation/__tests__/fixtures/edgeCaseBlueprints";
import { isShapeAllowedForBlockType } from "@/src/lib/voxel/blocks/materialMetaHelpers";
import { validateVoxelStructurePlacements } from "@/src/lib/voxel/voxelBlockPlacement";

import { assertGeneratedStructurePlacementSemantics } from "./testUtils";

describe("paneAxisForWindowCell", () => {
  test("front/back façades (constant lz) use axis x", () => {
    const W = 9;
    const D = 9;
    expect(paneAxisForWindowCell(4, D - 1, W, D)).toBe("x");
    expect(paneAxisForWindowCell(4, 0, W, D)).toBe("x");
  });

  test("left/right façades (constant lx) use axis z", () => {
    const W = 9;
    const D = 9;
    expect(paneAxisForWindowCell(0, 4, W, D)).toBe("z");
    expect(paneAxisForWindowCell(W - 1, 4, W, D)).toBe("z");
  });

  test("returns undefined for corners (ambiguous façade)", () => {
    const W = 9;
    const D = 9;
    expect(paneAxisForWindowCell(0, 0, W, D)).toBeUndefined();
    expect(paneAxisForWindowCell(W - 1, D - 1, W, D)).toBeUndefined();
  });
});

describe("medieval tower window panes (Phase A)", () => {
  test("default preset emits glass panes with valid axis and placement semantics", () => {
    const preset = getMedievalTowerPreset(DEFAULT_MEDIEVAL_PRESET_ID);
    expect(preset).toBeDefined();
    const blueprint = structuredClone(preset!.blueprint);
    const validation = validateBlueprint(blueprint);
    expect(validation.ok).toBe(true);
    const resolved = validation.resolved!;
    const blocks = generateStructureFromResolved(resolved);

    assertGeneratedStructurePlacementSemantics({
      id: preset!.id,
      label: preset!.label,
      blocks,
    });

    const panes = blocks.filter((b) => b.shapeKind === "pane");
    expect(panes.length).toBeGreaterThan(0);
    for (const b of panes) {
      expect(b.state?.axis === "x" || b.state?.axis === "z").toBe(true);
      expect(isShapeAllowedForBlockType(b.blockTypeId, "pane")).toBe(true);
    }
  });

  test("falls back to cube windows when window material does not allow pane", () => {
    const base = EDGE_CASE_BLUEPRINT_FIXTURES.find(
      (f) => f.id === "height_budget_body_clamp",
    )!.blueprint;
    const cloned = structuredClone(base) as MedievalTowerBlueprint;
    const blueprint: MedievalTowerBlueprint = {
      ...cloned,
      materials: {
        ...cloned.materials,
        window: "oak_planks",
      },
    };

    const validation = validateBlueprint(blueprint);
    expect(validation.ok).toBe(true);
    const resolved = validation.resolved!;
    expect(isShapeAllowedForBlockType(resolved.materials.window, "pane")).toBe(
      false,
    );

    const blocks = generateStructureFromResolved(resolved);
    expect(blocks.some((b) => b.shapeKind === "pane")).toBe(false);
    assertGeneratedStructurePlacementSemantics({
      id: "window_oak_planks_fallback",
      label: "cloned fixture — oak_planks window slot",
      blocks,
    });
    expect(validateVoxelStructurePlacements({ blocks }).ok).toBe(true);
  });
});
