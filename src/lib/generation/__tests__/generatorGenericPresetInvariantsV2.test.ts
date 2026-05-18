import { describe, expect, it } from "vitest";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import { GENERIC_BUILDING_V2_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import { resolveGenericBuildingV2 } from "@/src/lib/blueprints/resolveGenericBuildingV2";
import { validateGenericBuildingBlueprintV2 } from "@/src/lib/blueprints/validateGenericBuildingV2";
import { compileGenericBuildingV2Plan } from "@/src/lib/generation/components/v2/compileGenericBuildingV2Plan";
import { emitFromComponentPlanV2 } from "@/src/lib/generation/components/v2/emitFromComponentPlanV2";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { generateGenericBuildingV2 } from "@/src/lib/generation/generators/generateGenericBuildingV2";
import { analyzeVoxelStructure } from "@/src/lib/voxel/structureAnalysis";
import {
  assertGeneratedStructureHardInvariants,
  assertGeneratedStructurePlacementSemantics,
} from "./testUtils";

function pipelineBlocks(presetId: string) {
  const preset = GENERIC_BUILDING_V2_PRESETS.find((p) => p.id === presetId)!;
  const validation = validateGenericBuildingBlueprintV2(
    structuredClone(preset.blueprint),
  );
  expect(validation.ok).toBe(true);
  const resolved = resolveGenericBuildingV2(validation.normalized!);
  const plan = compileGenericBuildingV2Plan(resolved);
  return {
    blocks: generateGenericBuildingV2(resolved),
    plan,
    resolved,
    constraints: preset.blueprint.constraints,
  };
}

function hasMaterial(
  blocks: readonly { blockTypeId: string }[],
  classicKey: string,
): boolean {
  const id = blockTypeId("classic", classicKey);
  return blocks.some((b) => b.blockTypeId === id);
}

describe("generator preset invariants (generic buildings v2)", () => {
  it.each(GENERIC_BUILDING_V2_PRESETS)(
    "preset $id: validates, resolves, compiles, generates, and passes invariants",
    (preset) => {
      const validation = validateGenericBuildingBlueprintV2(
        structuredClone(preset.blueprint),
      );
      expect(validation.ok, preset.id).toBe(true);
      expect(validation.normalized).toBeDefined();

      const resolved = resolveGenericBuildingV2(validation.normalized!);
      const plan = compileGenericBuildingV2Plan(resolved);
      expect(plan.planVersion).toBe(2);
      expect(plan.components.length).toBeGreaterThan(0);

      const blocks = emitFromComponentPlanV2(plan);
      const analysis = analyzeVoxelStructure(blocks);

      assertGeneratedStructureHardInvariants({
        id: preset.id,
        label: preset.label,
        blocks,
        analysis,
        maxBlockCount: preset.blueprint.constraints.maxBlockCount,
      });
      assertGeneratedStructurePlacementSemantics({
        id: preset.id,
        label: preset.label,
        blocks,
      });
    },
  );

  it("generateStructure dispatches schemaVersion 2 presets", () => {
    const preset = GENERIC_BUILDING_V2_PRESETS[0]!;
    const blocks = generateStructure(structuredClone(preset.blueprint));
    expect(blocks.length).toBeGreaterThan(0);
  });
});

describe("generator v2 preset feature smoke", () => {
  it("simple_cabin_v2 includes door, window, chimney, and step materials", () => {
    const { blocks, plan } = pipelineBlocks("simple_cabin_v2");
    expect(plan.openings.doorMask.size).toBeGreaterThan(0);
    expect(plan.openings.windowMask.size).toBeGreaterThan(0);
    expect(hasMaterial(blocks, "glass")).toBe(true);
    expect(hasMaterial(blocks, "oak_planks")).toBe(true);
    expect(hasMaterial(blocks, "limestone")).toBe(true);
  });

  it("porch_house_v2 includes porch deck blocks beyond room depth", () => {
    const { blocks, plan } = pipelineBlocks("porch_house_v2");
    const room = plan.components.find((c) => c.kind === "room_shell");
    expect(room?.kind).toBe("room_shell");
    if (room?.kind !== "room_shell") return;
    const maxLz = Math.max(...blocks.map((b) => b.z));
    const minLz = Math.min(...blocks.map((b) => b.z));
    const roomDepth = room.params.depth;
    expect(maxLz - minLz + 1).toBeGreaterThanOrEqual(roomDepth);
    expect(plan.components.some((c) => c.kind === "porch")).toBe(true);
  });
});
