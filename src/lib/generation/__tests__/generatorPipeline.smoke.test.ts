import { describe, expect, it } from "vitest";
import { SAMPLE_MEDIEVAL_TOWER_BLUEPRINT } from "@/src/lib/blueprints/sampleBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";

import { assertGeneratedStructurePlacementSemantics } from "./testUtils";

describe("generator pipeline (smoke)", () => {
  it("validates the default medieval tower preset and produces non-empty voxels", () => {
    const blueprint = structuredClone(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT);
    const validation = validateBlueprint(blueprint);

    expect(validation.ok).toBe(true);
    expect(validation.resolved).toBeDefined();

    const resolved = validation.resolved!;
    const blocks = generateStructureFromResolved(resolved);
    expect(blocks.length).toBeGreaterThan(0);
    assertGeneratedStructurePlacementSemantics({
      id: "smoke",
      label: "default sample blueprint",
      blocks,
    });
  });
});
