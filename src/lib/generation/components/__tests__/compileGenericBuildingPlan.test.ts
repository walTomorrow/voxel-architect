import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";
import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { compileGenericBuildingToComponentPlan } from "@/src/lib/generation/components/compileGenericBuildingPlan";

function resolvedFromPreset(id: string): ResolvedGenericBuilding {
  const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === id)!;
  const v = validateBlueprint(structuredClone(preset.blueprint));
  expect(v.ok).toBe(true);
  return v.resolved as ResolvedGenericBuilding;
}

describe("compileGenericBuildingToComponentPlan", () => {
  it.each(GENERIC_BUILDING_PRESETS)(
    "preset $id: has exactly one body_main rectangular_body",
    (preset) => {
      const plan = compileGenericBuildingToComponentPlan(
        resolvedFromPreset(preset.id),
      );
      const bodies = plan.components.filter((c) => c.kind === "rectangular_body");
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.id).toBe("body_main");
    },
  );

  it("cabin plan includes windows, roof, chimney, and front_step", () => {
    const plan = compileGenericBuildingToComponentPlan(
      resolvedFromPreset("simple_rustic_cabin"),
    );
    const kinds = plan.components.map((c) => c.kind);
    expect(kinds).toContain("sparse_windows");
    expect(kinds).toContain("pitched_gable_roof");
    expect(kinds).toContain("chimney");
    expect(kinds).toContain("front_step");
    const step = plan.components.find((c) => c.kind === "front_step");
    expect(step?.target).toBe("entrance_main");
  });

  it("workshop plan uses shed roof and omits chimney", () => {
    const plan = compileGenericBuildingToComponentPlan(
      resolvedFromPreset("shed_roof_workshop"),
    );
    expect(plan.components.some((c) => c.kind === "shed_roof")).toBe(true);
    expect(plan.components.some((c) => c.kind === "chimney")).toBe(false);
    expect(plan.components.some((c) => c.kind === "front_step")).toBe(false);
  });

  it("roof none omits roof component", () => {
    const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === "simple_rustic_cabin")!;
    const bp = {
      ...structuredClone(preset.blueprint),
      roof: { kind: "none" as const },
    };
    const v = validateBlueprint(bp);
    const plan = compileGenericBuildingToComponentPlan(
      v.resolved as ResolvedGenericBuilding,
    );
    expect(plan.components.some((c) => c.kind === "pitched_gable_roof")).toBe(false);
    expect(plan.components.some((c) => c.kind === "shed_roof")).toBe(false);
  });

  it("windows none omits sparse_windows component", () => {
    const preset = GENERIC_BUILDING_PRESETS.find((p) => p.id === "simple_rustic_cabin")!;
    const bp = {
      ...structuredClone(preset.blueprint),
      openings: {
        ...preset.blueprint.openings,
        windows: { mode: "none" as const, count: 0 },
      },
    };
    const v = validateBlueprint(bp);
    const plan = compileGenericBuildingToComponentPlan(
      v.resolved as ResolvedGenericBuilding,
    );
    expect(plan.components.some((c) => c.kind === "sparse_windows")).toBe(false);
  });
});
