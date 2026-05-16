import { describe, expect, it } from "vitest";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { analyzeVoxelStructure } from "@/src/lib/voxel/structureAnalysis";

import { BLACKSMITH_EDGE_CASE_FIXTURES } from "./fixtures/blacksmithEdgeCaseBlueprints";
import {
  assertGeneratedStructureHardInvariants,
  assertGeneratedStructurePlacementSemantics,
} from "./testUtils";

describe("generator blacksmith edge-case invariants", () => {
  it.each(BLACKSMITH_EDGE_CASE_FIXTURES)(
    "fixture $id: validates, generates, and passes invariants",
    (fixture) => {
      const blueprint = structuredClone(fixture.blueprint);
      const validation = validateBlueprint(blueprint);

      expect(
        validation.ok,
        `[${fixture.id}] ${validation.errors.join("; ")}`,
      ).toBe(true);
      expect(validation.resolved?.structureType).toBe("blacksmith_workshop");

      const resolved = validation.resolved!;
      const blocks = generateStructureFromResolved(resolved);
      const analysis = analyzeVoxelStructure(blocks);

      assertGeneratedStructureHardInvariants({
        id: fixture.id,
        label: fixture.label,
        blocks,
        analysis,
        maxBlockCount: resolved.constraints.maxBlockCount,
      });
      assertGeneratedStructurePlacementSemantics({
        id: fixture.id,
        label: fixture.label,
        blocks,
      });
    },
  );
});
