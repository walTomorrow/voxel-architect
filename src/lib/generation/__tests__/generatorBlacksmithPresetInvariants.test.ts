import { describe, expect, it } from "vitest";
import { BLACKSMITH_PRESETS } from "@/src/lib/blueprints/sampleBlacksmithBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { analyzeVoxelStructure } from "@/src/lib/voxel/structureAnalysis";

import {
  assertGeneratedStructureHardInvariants,
  assertGeneratedStructurePlacementSemantics,
} from "./testUtils";

describe("generator blacksmith preset invariants", () => {
  it.each(BLACKSMITH_PRESETS)(
    "preset $id: validates, generates, and passes structural invariants",
    (preset) => {
      const blueprint = structuredClone(preset.blueprint);
      const validation = validateBlueprint(blueprint);

      expect(
        validation.ok,
        `[${preset.id}] ${validation.errors.join("; ")}`,
      ).toBe(true);
      expect(validation.resolved).toBeDefined();

      const resolved = validation.resolved!;
      expect(resolved.structureType).toBe("blacksmith_workshop");

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
