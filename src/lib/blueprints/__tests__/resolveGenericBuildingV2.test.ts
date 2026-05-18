import { describe, expect, it } from "vitest";
import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import { GENERIC_BUILDING_V2_PRESETS } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import { parseRoomSurfaceRef } from "@/src/lib/blueprints/parseRoomSurfaceRef";
import { resolveGenericBuildingV2 } from "@/src/lib/blueprints/resolveGenericBuildingV2";
import { validateGenericBuildingBlueprintV2 } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";

function normalizedFromPreset(id: string) {
  const preset = GENERIC_BUILDING_V2_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  const result = validateGenericBuildingBlueprintV2(
    structuredClone(preset.blueprint),
  );
  if (!result.ok || !result.normalized) {
    throw new Error(`preset ${id} failed validation`);
  }
  return result.normalized;
}

describe("resolveGenericBuildingV2", () => {
  it("resolves all shipped v2 presets", () => {
    for (const preset of GENERIC_BUILDING_V2_PRESETS) {
      const resolved = resolveGenericBuildingV2(normalizedFromPreset(preset.id));
      expect(resolved.rootRoomId).toBe("main-room");
      expect(resolved.components.length).toBeGreaterThan(0);
    }
  });

  it("detects root room and assigns compiler origin at zero", () => {
    const resolved = resolveGenericBuildingV2(normalizedFromPreset("simple_cabin_v2"));
    expect(resolved.rootRoomId).toBe("main-room");
    expect(resolved.origin).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("derives five root room surfaces", () => {
    const resolved = resolveGenericBuildingV2(normalizedFromPreset("simple_cabin_v2"));
    expect(resolved.surfaces.size).toBe(5);
    for (const face of ["front", "back", "left", "right", "roof"] as const) {
      const ref = `main-room.${face}` as const;
      expect(resolved.surfaces.has(ref)).toBe(true);
      const s = resolved.surfaces.get(ref)!;
      expect(s.roomId).toBe("main-room");
      expect(s.face).toBe(face);
    }
    const front = resolved.surfaces.get("main-room.front")!;
    expect(front.side).toBe("front");
    expect(front.interiorLo).toBeLessThan(front.interiorHi);
  });

  it("parses public targetSurface into structured refs on doors", () => {
    const resolved = resolveGenericBuildingV2(normalizedFromPreset("simple_cabin_v2"));
    const door = resolved.components.find((c) => c.id === "front-door");
    expect(door?.type).toBe("door");
    if (door?.type === "door") {
      const parsed = parseRoomSurfaceRef(door.aperture.surfaceRef);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.parsed.roomId).toBe("main-room");
        expect(parsed.parsed.face).toBe("front");
      }
    }
  });

  it("resolves component materials from override then blueprint palette", () => {
    const bp = structuredClone(
      normalizedFromPreset("simple_cabin_v2"),
    ) as unknown as GenericBuildingBlueprintV2Draft;
    const door = bp.components.find((c) => c.id === "front-door");
    if (door) {
      door.materials = { door: "limestone" };
    }
    const validated = validateGenericBuildingBlueprintV2(bp);
    const resolved = resolveGenericBuildingV2(validated.normalized!);
    const resolvedDoor = resolved.components.find((c) => c.id === "front-door");
    expect(resolvedDoor?.type).toBe("door");
    if (resolvedDoor?.type === "door") {
      expect(resolvedDoor.materials.door).toEqual(
        blockTypeId("classic", "limestone"),
      );
      expect(resolvedDoor.materials.wall).toEqual(resolved.materials.wall);
    }
  });

  it("resolves roof targetRoom and step door anchor", () => {
    const resolved = resolveGenericBuildingV2(normalizedFromPreset("simple_cabin_v2"));
    const roof = resolved.components.find((c) => c.id === "main-roof");
    expect(roof?.type).toBe("roof");
    if (roof?.type === "roof") {
      expect(roof.targetRoom).toBe("main-room");
    }
    const step = resolved.components.find((c) => c.id === "front-step");
    expect(step?.type).toBe("step");
    if (step?.type === "step") {
      expect(step.targetDoorId).toBe("front-door");
      expect(step.anchor.doorId).toBe("front-door");
      expect(resolved.anchors.get("front-door")?.doorId).toBe("front-door");
    }
  });

  it("resolves porch aroundDoor when present", () => {
    const bp = structuredClone(
      normalizedFromPreset("porch_house_v2"),
    ) as unknown as GenericBuildingBlueprintV2Draft;
    const porch = bp.components.find((c) => c.id === "front-porch");
    if (porch?.type === "porch") {
      porch.widthMode = "door_only";
      porch.aroundDoor = "front-door";
    }
    const validated = validateGenericBuildingBlueprintV2(bp);
    const resolved = resolveGenericBuildingV2(validated.normalized!);
    const resolvedPorch = resolved.components.find((c) => c.id === "front-porch");
    expect(resolvedPorch?.type).toBe("porch");
    if (resolvedPorch?.type === "porch") {
      expect(resolvedPorch.aroundDoorId).toBe("front-door");
    }
  });

  it("groups openings by facade", () => {
    const resolved = resolveGenericBuildingV2(normalizedFromPreset("stone_workshop_v2"));
    const front = resolved.openingsByFacade.get("front");
    expect(front?.doors.length).toBe(1);
    expect(front?.windows.length).toBe(1);
    const left = resolved.openingsByFacade.get("left");
    expect(left?.windows.length).toBe(1);
  });
});
