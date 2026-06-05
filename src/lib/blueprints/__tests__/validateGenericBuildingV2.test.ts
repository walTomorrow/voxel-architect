import { describe, expect, it } from "vitest";
import { GENERIC_BUILDING_V2_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import { parseRoomSurfaceRef } from "@/src/lib/blueprints/parseRoomSurfaceRef";
import { validateGenericBuildingBlueprintV2 } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";

function clonePreset(id: string): GenericBuildingBlueprintV2Draft {
  const preset = GENERIC_BUILDING_V2_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return structuredClone(preset.blueprint) as unknown as GenericBuildingBlueprintV2Draft;
}

function codes(result: ReturnType<typeof validateGenericBuildingBlueprintV2>) {
  return [
    ...result.errors.map((e) => e.code),
    ...result.warnings.map((w) => w.code),
    ...result.notes.map((n) => n.code),
  ];
}

describe("parseRoomSurfaceRef", () => {
  it("parses valid surface strings", () => {
    const r = parseRoomSurfaceRef("main-room.front");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parsed.roomId).toBe("main-room");
      expect(r.parsed.face).toBe("front");
    }
  });

  it("rejects invalid surface strings", () => {
    expect(parseRoomSurfaceRef("Main-Room.front").ok).toBe(false);
    expect(parseRoomSurfaceRef("main-room").ok).toBe(false);
    expect(parseRoomSurfaceRef("main-room.top").ok).toBe(false);
  });
});

describe("validateGenericBuildingBlueprintV2", () => {
  it("accepts all shipped v2 presets", () => {
    for (const preset of GENERIC_BUILDING_V2_PRESETS) {
      const r = validateGenericBuildingBlueprintV2(
        structuredClone(preset.blueprint),
      );
      expect(r.ok, preset.id).toBe(true);
      expect(r.normalized).toBeDefined();
      expect(r.errors).toHaveLength(0);
    }
  });

  it("validateBlueprint dispatches schemaVersion 2 to v2 validator", () => {
    const r = validateBlueprint(clonePreset("simple_cabin_v2"));
    expect(isBlueprintValidationResultV2(r)).toBe(true);
    if (isBlueprintValidationResultV2(r)) {
      expect(r.ok).toBe(true);
    }
  });

  it("rejects duplicate component id", () => {
    const bp = clonePreset("simple_cabin_v2");
    bp.components = [
      ...bp.components,
      {
        id: "main-room",
        type: "chimney",
        attach: { targetSurface: "main-room.right" },
      },
    ];
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("duplicate_component_id");
  });

  it("rejects invalid slug id", () => {
    const bp = clonePreset("simple_cabin_v2");
    const door = bp.components.find((c) => c.id === "front-door");
    if (door) (door as { id: string }).id = "Front-Door";
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("invalid_component_id");
  });

  it("rejects missing room", () => {
    const bp = clonePreset("simple_cabin_v2");
    bp.components = bp.components.filter((c) => c.type !== "room");
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("missing_root_room");
  });

  it("rejects multiple rooms", () => {
    const bp = clonePreset("simple_cabin_v2");
    bp.components = [
      ...bp.components,
      {
        id: "extra-room",
        type: "room",
        width: 7,
        depth: 7,
        wallHeight: 4,
        wallThickness: 1,
        hollowInterior: true,
      },
    ];
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("multiple_root_rooms");
  });

  it("rejects invalid targetSurface string", () => {
    const bp = clonePreset("simple_cabin_v2");
    const door = bp.components.find((c) => c.id === "front-door");
    if (door?.type === "door") {
      door.attach = { targetSurface: "main-room.invalid" as "main-room.front" };
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("invalid_target_surface");
  });

  it("rejects targetSurface for unknown room component", () => {
    const bp = clonePreset("simple_cabin_v2");
    const door = bp.components.find((c) => c.id === "front-door");
    if (door?.type === "door") {
      door.attach = { targetSurface: "other-room.front" as "main-room.front" };
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("unknown_surface_room");
  });

  it("rejects targetSurface referencing a non-room component", () => {
    const bp = clonePreset("simple_cabin_v2");
    const door = bp.components.find((c) => c.id === "front-door");
    if (door?.type === "door") {
      door.attach = { targetSurface: "main-roof.front" as "main-room.front" };
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("surface_target_not_room");
  });

  it("rejects unknown roof targetRoom", () => {
    const bp = clonePreset("simple_cabin_v2");
    const roof = bp.components.find((c) => c.id === "main-roof");
    if (roof?.type === "roof") {
      roof.targetRoom = "ghost-room";
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("unknown_target_room");
  });

  it("rejects step with unknown targetDoor", () => {
    const bp = clonePreset("simple_cabin_v2");
    const step = bp.components.find((c) => c.id === "front-step");
    if (step?.type === "step") {
      step.attach = { targetDoor: "ghost-door" };
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("unknown_target_door");
  });

  it("rejects step targetDoor that is not a door", () => {
    const bp = clonePreset("simple_cabin_v2");
    const step = bp.components.find((c) => c.id === "front-step");
    if (step?.type === "step") {
      step.attach = { targetDoor: "main-room" };
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("target_door_not_door");
  });

  it("rejects porch aroundDoor unknown", () => {
    const bp = clonePreset("porch_house_v2");
    const porch = bp.components.find((c) => c.id === "front-porch");
    if (porch?.type === "porch") {
      porch.widthMode = "door_only";
      porch.aroundDoor = "ghost-door";
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("unknown_around_door");
  });

  it("rejects invalid classic material key", () => {
    const bp = clonePreset("simple_cabin_v2");
    bp.materials = { ...bp.materials, wall: "not_a_real_block_id" };
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("invalid_material_key");
  });

  it("normalizes missing placement.horizontal to center", () => {
    const bp = clonePreset("simple_cabin_v2");
    const door = bp.components.find((c) => c.id === "front-door");
    if (door?.type === "door") {
      door.attach = { targetSurface: "main-room.front" };
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(true);
    expect(codes(r)).toContain("default_placement_horizontal");
    const normDoor = r.normalized?.components.find((c) => c.id === "front-door");
    expect(normDoor?.type).toBe("door");
    if (normDoor?.type === "door") {
      expect(normDoor.attach.placement?.horizontal).toBe("center");
    }
  });

  it("warns when no door component", () => {
    const bp = clonePreset("stone_workshop_v2");
    bp.components = bp.components.filter((c) => c.type !== "door");
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(true);
    expect(codes(r)).toContain("no_door");
  });

  it("warns when no window_group components", () => {
    const bp = clonePreset("simple_cabin_v2");
    bp.components = bp.components.filter((c) => c.type !== "window_group");
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(true);
    expect(codes(r)).toContain("no_windows");
  });

  it("rejects door too wide for façade", () => {
    const bp = clonePreset("simple_cabin_v2");
    const room = bp.components.find((c) => c.id === "main-room");
    if (room?.type === "room") {
      room.width = 5;
      room.depth = 5;
      room.wallThickness = 2;
    }
    const door = bp.components.find((c) => c.id === "front-door");
    if (door?.type === "door") {
      door.width = 3;
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("door_too_wide");
  });

  it("rejects window count above façade capacity (deterministic error)", () => {
    const bp = clonePreset("simple_cabin_v2");
    const wins = bp.components.find((c) => c.id === "front-windows");
    if (wins?.type === "window_group") {
      wins.count = 12;
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("window_count_exceeds_facade");
  });

  it("window_count_high warning message includes target surface", () => {
    const bp = clonePreset("stone_workshop_v2");
    const wins = bp.components.find((c) => c.id === "front-windows");
    if (wins?.type === "window_group") {
      wins.count = 2;
    }
    const r = validateGenericBuildingBlueprintV2(bp);
    const high = r.warnings.find((w) => w.code === "window_count_high");
    expect(high?.message).toMatch(/on main-room\.front/);
  });
});
