import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { analyzeVoxelStructure } from "@/src/lib/voxel/structureAnalysis";

import {
  assertGeneratedStructureHardInvariants,
  assertGeneratedStructurePlacementSemantics,
} from "./testUtils";

describe("generator preset invariants (generic buildings)", () => {
  it.each(GENERIC_BUILDING_PRESETS)(
    "preset $id: validates, generates, and passes structural invariants",
    (preset) => {
      const blueprint = structuredClone(preset.blueprint);
      const validation = validateBlueprint(blueprint);

      expect(
        validation.ok,
        `[${preset.id}] ${preset.label}: validation failed — errors=${JSON.stringify(validation.errors)}`,
      ).toBe(true);
      expect(validation.resolved).toBeDefined();

      const resolved = validation.resolved!;
      const blocks = generateStructureFromResolved(resolved);
      const analysis = analyzeVoxelStructure(blocks);

      assertGeneratedStructureHardInvariants({
        id: preset.id,
        label: preset.label,
        blocks,
        analysis,
        maxBlockCount: resolved.constraints.maxBlockCount,
      });
      assertGeneratedStructurePlacementSemantics({
        id: preset.id,
        label: preset.label,
        blocks,
      });
    },
  );
});
