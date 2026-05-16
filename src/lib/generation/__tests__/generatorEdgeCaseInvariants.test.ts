import { describe, expect, it } from "vitest";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { analyzeVoxelStructure } from "@/src/lib/voxel/structureAnalysis";

import { EDGE_CASE_BLUEPRINT_FIXTURES } from "./fixtures/edgeCaseBlueprints";
import {
  assertGeneratedStructureHardInvariants,
  assertGeneratedStructurePlacementSemantics,
} from "./testUtils";

describe("generator edge-case blueprint invariants", () => {
  it.each(EDGE_CASE_BLUEPRINT_FIXTURES)(
    "fixture $id: validates, generates, and passes structural invariants",
    (fixture) => {
      const blueprint = structuredClone(fixture.blueprint);
      const validation = validateBlueprint(blueprint);

      expect(
        validation.ok,
        `[${fixture.id}] ${fixture.label}: validation failed — errors=${JSON.stringify(validation.errors)} notes=${JSON.stringify(validation.notes)}`,
      ).toBe(true);
      expect(
        validation.resolved,
        `[${fixture.id}] ${fixture.label}: validateBlueprint ok but missing resolved`,
      ).toBeDefined();

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
