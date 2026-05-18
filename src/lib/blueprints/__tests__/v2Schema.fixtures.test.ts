import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_V2_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import type {
  ComponentPlanV2,
  PlanComponentV2,
} from "@/src/lib/generation/components/v2/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import type {
  BlueprintValidationResultV2,
  GenericBuildingBlueprintV2,
  ValidationIssue,
} from "@/src/lib/blueprints/types";

describe("GenericBuildingBlueprint v2 schema fixtures", () => {
  it("exports three v2 presets with schemaVersion 2", () => {
    expect(GENERIC_BUILDING_V2_PRESETS).toHaveLength(3);
    for (const preset of GENERIC_BUILDING_V2_PRESETS) {
      expect(preset.blueprint.schemaVersion).toBe(2);
      expect(preset.blueprint.structureType).toBe("generic_building");
      expect(preset.blueprint.components.length).toBeGreaterThan(0);
    }
  });

  it("simple_cabin_v2 uses approved component ids and surfaces", () => {
    const bp = GENERIC_BUILDING_V2_PRESETS.find((p) => p.id === "simple_cabin_v2")!
      .blueprint;
    const ids = bp.components.map((c) => c.id);
    expect(ids).toContain("main-room");
    expect(ids).toContain("main-roof");
    expect(ids).toContain("front-door");
    const door = bp.components.find((c) => c.id === "front-door");
    expect(door?.type).toBe("door");
    if (door?.type === "door") {
      expect(door.attach.targetSurface).toBe("main-room.front");
    }
    const roof = bp.components.find((c) => c.id === "main-roof");
    expect(roof?.type).toBe("roof");
    if (roof?.type === "roof") {
      expect(roof.targetRoom).toBe("main-room");
    }
  });

  it("validateBlueprint returns not-implemented for schemaVersion 2", () => {
    const bp = GENERIC_BUILDING_V2_PRESETS[0].blueprint;
    const r = validateBlueprint(bp);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/schemaVersion 2 is not implemented/i);
  });

  it("v2 validation result and plan types are importable (compile-time surface)", () => {
    const _issue: ValidationIssue = {
      severity: "error",
      code: "fixture",
      message: "fixture",
    };
    const _result: BlueprintValidationResultV2 = {
      ok: false,
      errors: [_issue],
      warnings: [],
      notes: [],
    };
    const _bp: GenericBuildingBlueprintV2 = GENERIC_BUILDING_V2_PRESETS[0].blueprint;
    const _plan: ComponentPlanV2 = {
      planVersion: 2,
      sourceSchemaVersion: 2,
      rootRoomId: "main-room",
      bounds: {
        origin: { x: 0, y: 0, z: 0 },
        width: 1,
        depth: 1,
        bodyLayers: 1,
        roofLayers: 0,
        overhang: 0,
      },
      materials: {
        wall: blockTypeId("classic", "cobblestone"),
        floor: blockTypeId("classic", "cobblestone"),
        roof: blockTypeId("classic", "cobblestone"),
        window: blockTypeId("classic", "glass"),
        door: blockTypeId("classic", "oak_planks"),
        accent: blockTypeId("classic", "limestone"),
      },
      constraints: _bp.constraints,
      openings: {
        shellSkipMask: new Set(),
        windowMask: new Set(),
        doorMask: new Set(),
      },
      components: [] as PlanComponentV2[],
    };
    expect(_result.ok).toBe(false);
    expect(_plan.planVersion).toBe(2);
  });
});
