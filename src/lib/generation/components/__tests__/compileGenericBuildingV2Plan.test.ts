import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_V2_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import { resolveGenericBuildingV2 } from "@/src/lib/blueprints/resolveGenericBuildingV2";
import { validateGenericBuildingBlueprintV2 } from "@/src/lib/blueprints/validateGenericBuildingV2";
import { compileGenericBuildingV2Plan } from "@/src/lib/generation/components/v2/compileGenericBuildingV2Plan";
import type { PlanComponentKindV2 } from "@/src/lib/generation/components/v2/types";

function planFromPreset(id: string) {
  const preset = GENERIC_BUILDING_V2_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  const validation = validateGenericBuildingBlueprintV2(
    structuredClone(preset.blueprint),
  );
  if (!validation.ok || !validation.normalized) {
    throw new Error(`preset ${id} failed validation`);
  }
  const resolved = resolveGenericBuildingV2(validation.normalized);
  return compileGenericBuildingV2Plan(resolved);
}

function planKinds(plan: ReturnType<typeof compileGenericBuildingV2Plan>): PlanComponentKindV2[] {
  return plan.components.map((c) => c.kind);
}

describe("compileGenericBuildingV2Plan", () => {
  it("lowers valid presets without emitting voxels", () => {
    for (const preset of GENERIC_BUILDING_V2_PRESETS) {
      const plan = planFromPreset(preset.id);
      expect(plan.planVersion).toBe(2);
      expect(plan.sourceSchemaVersion).toBe(2);
      expect(plan.rootRoomId).toBe("main-room");
      expect(plan.components.length).toBeGreaterThan(0);
      expect(plan.openings.shellSkipMask.size).toBeGreaterThanOrEqual(0);
    }
  });

  it("simple_cabin_v2 has expected plan component kinds", () => {
    const kinds = planKinds(planFromPreset("simple_cabin_v2"));
    expect(kinds).toContain("room_shell");
    expect(kinds).toContain("roof");
    expect(kinds).toContain("door");
    expect(kinds).toContain("window_group");
    expect(kinds).toContain("chimney");
    expect(kinds).toContain("step");
  });

  it("porch_house_v2 includes porch plan component", () => {
    expect(planKinds(planFromPreset("porch_house_v2"))).toContain("porch");
  });

  it("door plan carries aperture descriptor and source id", () => {
    const plan = planFromPreset("simple_cabin_v2");
    const door = plan.components.find((c) => c.kind === "door");
    expect(door?.kind).toBe("door");
    if (door?.kind === "door") {
      expect(door.sourceComponentId).toBe("front-door");
      expect(door.aperture.side).toBe("front");
      expect(door.aperture.width).toBe(2);
      expect(door.aperture.spanLo).toBeLessThanOrEqual(door.aperture.spanHi);
    }
  });

  it("window_group plan carries count, layout, heightBand, and slots", () => {
    const plan = planFromPreset("simple_cabin_v2");
    const win = plan.components.find((c) => c.kind === "window_group");
    expect(win?.kind).toBe("window_group");
    if (win?.kind === "window_group") {
      expect(win.sourceComponentId).toBe("front-windows");
      expect(win.aperture.count).toBe(2);
      expect(win.aperture.layout).toBe("symmetric");
      expect(win.aperture.heightBand).toBe("auto");
      expect(win.aperture.slots.length).toBe(2);
    }
  });

  it("roof plan references targetRoom via params", () => {
    const plan = planFromPreset("simple_cabin_v2");
    const roof = plan.components.find((c) => c.kind === "roof");
    expect(roof?.kind).toBe("roof");
    if (roof?.kind === "roof") {
      expect(roof.sourceComponentId).toBe("main-roof");
      expect(roof.params.targetRoomId).toBe("main-room");
      expect(roof.params.kind).toBe("pitched_gable");
    }
  });

  it("step plan anchors to target door", () => {
    const plan = planFromPreset("simple_cabin_v2");
    const step = plan.components.find((c) => c.kind === "step");
    expect(step?.kind).toBe("step");
    if (step?.kind === "step") {
      expect(step.targetDoorId).toBe("front-door");
      expect(step.anchor.surfaceRef).toBe("main-room.front");
    }
  });

  it("simple_cabin_v2 bounds are deterministic", () => {
    const a = planFromPreset("simple_cabin_v2");
    const b = planFromPreset("simple_cabin_v2");
    expect(a.bounds).toEqual(b.bounds);
    expect(a.bounds).toEqual({
      origin: { x: 0, y: 0, z: 0 },
      width: 9,
      depth: 8,
      bodyLayers: 5,
      roofLayers: 2,
      overhang: 0,
    });
  });

  it("derives non-empty door mask for cabin front door", () => {
    const plan = planFromPreset("simple_cabin_v2");
    expect(plan.openings.doorMask.size).toBeGreaterThan(0);
    expect(plan.openings.windowMask.size).toBeGreaterThan(0);
  });
});
