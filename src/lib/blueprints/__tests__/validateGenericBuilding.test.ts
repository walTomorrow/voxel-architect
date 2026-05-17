import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import type {
  GenericBuildingBlueprint,
  ResolvedGenericBuilding,
} from "@/src/lib/blueprints/types";
import { validateGenericBuildingBlueprint } from "@/src/lib/blueprints/validateGenericBuilding";

function clonePreset(id: string): GenericBuildingBlueprint {
  const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return structuredClone(preset.blueprint);
}

describe("validateGenericBuildingBlueprint", () => {
  it("accepts shipped presets", () => {
    for (const preset of GENERIC_BUILDING_PRESETS) {
      const r = validateGenericBuildingBlueprint(structuredClone(preset.blueprint));
      expect(r.ok, preset.id).toBe(true);
      expect(r.resolved?.structureType).toBe("generic_building");
    }
  });

  it("rejects invalid width", () => {
    const bp = clonePreset("simple_rustic_cabin");
    const bad = { ...bp, body: { ...bp.body, width: 3 } };
    const r = validateGenericBuildingBlueprint(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("width"))).toBe(true);
  });

  it("rejects entrance too wide", () => {
    const bp = clonePreset("simple_rustic_cabin");
    const bad = {
      ...bp,
      body: { ...bp.body, width: 5, depth: 5 },
      openings: {
        ...bp.openings,
        entrance: { ...bp.openings.entrance, width: 3 },
      },
    };
    const r = validateGenericBuildingBlueprint(bad);
    expect(r.ok).toBe(false);
  });

  it("rejects unknown material key", () => {
    const bp = clonePreset("simple_rustic_cabin");
    const bad = {
      ...bp,
      materials: { ...bp.materials, wall: "not_a_real_block_xyz" },
    };
    const r = validateGenericBuildingBlueprint(bad);
    expect(r.ok).toBe(false);
  });

  it("allows roof none with zero layers", () => {
    const bp = clonePreset("simple_rustic_cabin");
    const none = { ...bp, roof: { kind: "none" as const } };
    const r = validateGenericBuildingBlueprint(none);
    expect(r.ok).toBe(true);
    expect((r.resolved as ResolvedGenericBuilding).roof.layers).toBe(0);
  });
});
