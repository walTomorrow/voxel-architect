import { describe, expect, test } from "vitest";

import {
  BLACKSMITH_PRESETS,
  DEFAULT_BLACKSMITH_PRESET_ID,
  getBlacksmithPreset,
} from "@/src/lib/blueprints/sampleBlacksmithBlueprints";
import type { BlacksmithWorkshopBlueprint } from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { isShapeAllowedForBlockType } from "@/src/lib/voxel/blocks/materialMetaHelpers";
import { validateVoxelStructurePlacements } from "@/src/lib/voxel/voxelBlockPlacement";

import { assertGeneratedStructurePlacementSemantics } from "./testUtils";

describe("blacksmith workshop window panes", () => {
  test("default preset emits glass panes with valid axis when material allows", () => {
    const preset = getBlacksmithPreset(DEFAULT_BLACKSMITH_PRESET_ID);
    expect(preset).toBeDefined();
    const validation = validateBlueprint(structuredClone(preset!.blueprint));
    expect(validation.ok).toBe(true);
    const blocks = generateStructureFromResolved(validation.resolved!);

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
    expect(blocks.every((b) => b.shapeKind !== "slab")).toBe(true);
  });

  test("falls back to cube windows when window material does not allow pane", () => {
    const preset = getBlacksmithPreset(DEFAULT_BLACKSMITH_PRESET_ID)!;
    const cloned = structuredClone(preset.blueprint) as BlacksmithWorkshopBlueprint;
    const blueprint: BlacksmithWorkshopBlueprint = {
      ...cloned,
      materials: { ...cloned.materials, window: "oak_planks" },
    };
    const validation = validateBlueprint(blueprint);
    expect(validation.ok).toBe(true);
    expect(isShapeAllowedForBlockType(validation.resolved!.materials.window, "pane")).toBe(
      false,
    );
    const blocks = generateStructureFromResolved(validation.resolved!);
    expect(blocks.some((b) => b.shapeKind === "pane")).toBe(false);
    expect(validateVoxelStructurePlacements({ blocks }).ok).toBe(true);
  });
});

describe("blacksmith workshop smoke", () => {
  test("generateStructure validates and generates for each preset", () => {
    for (const preset of BLACKSMITH_PRESETS) {
      const validation = validateBlueprint(structuredClone(preset.blueprint));
      expect(validation.ok).toBe(true);
      const blocks = generateStructureFromResolved(validation.resolved!);
      expect(blocks.length).toBeGreaterThan(0);
    }
  });
});
