import { describe, expect, it } from "vitest";
import {
  DEFAULT_GENERIC_PRESET_ID,
  getGenericBuildingPreset,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";

describe("generator pipeline smoke", () => {
  it("validates the default generic preset and produces non-empty voxels", () => {
    const preset = getGenericBuildingPreset(DEFAULT_GENERIC_PRESET_ID);
    expect(preset).toBeDefined();
    const blueprint = structuredClone(preset!.blueprint);
    const validation = validateBlueprint(blueprint);
    expect(validation.ok, validation.errors.join("; ")).toBe(true);
    expect(validation.resolved).toBeDefined();
    const blocks = generateStructureFromResolved(validation.resolved!);
    expect(blocks.length).toBeGreaterThan(0);
  });
});
