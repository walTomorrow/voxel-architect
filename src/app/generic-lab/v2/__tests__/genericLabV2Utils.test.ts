import { describe, expect, it } from "vitest";
import {
  buildComponentTree,
  cloneV2PresetBlueprint,
  doorComponentIds,
  FACADE_FACES,
  patchComponent,
  setComponentMaterialOverride,
  targetSurfaceOptions,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";

describe("genericLabV2Utils", () => {
  const cabin = cloneV2PresetBlueprint("simple_cabin_v2");

  it("builds component tree with root room first", () => {
    const tree = buildComponentTree(cabin);
    expect(tree).not.toBeNull();
    expect(tree!.kind).toBe("room");
    expect(tree!.componentId).toBe("main-room");
  });

  it("orders facade surfaces front, back, left, right", () => {
    const tree = buildComponentTree(cabin)!;
    const surfaces = tree.children.filter((c) => c.kind === "surface");
    expect(surfaces.map((s) => s.face)).toEqual([...FACADE_FACES]);
  });

  it("nests steps under their target door", () => {
    const tree = buildComponentTree(cabin)!;
    const front = tree.children.find((c) => c.face === "front");
    const door = front?.children.find((c) => c.componentId === "front-door");
    expect(door?.children.some((c) => c.componentId === "front-step")).toBe(true);
  });

  it("groups roof components after surfaces", () => {
    const tree = buildComponentTree(cabin)!;
    const last = tree.children[tree.children.length - 1];
    expect(last.kind).toBe("roof_group");
    expect(last.label).toBe("roof");
    expect(last.children.some((c) => c.componentId === "main-roof")).toBe(true);
  });

  it("patchComponent preserves id and does not mutate the original draft", () => {
    const room = cabin.components.find((c) => c.type === "room");
    expect(room?.type).toBe("room");
    if (room?.type !== "room") return;

    const beforeWidth = room.width;
    const next = patchComponent(cabin, room.id, { ...room, width: beforeWidth + 2 });
    const patched = next.components.find((c) => c.id === room.id);
    expect(patched?.type).toBe("room");
    if (patched?.type === "room") {
      expect(patched.width).toBe(beforeWidth + 2);
    }
    expect(room.width).toBe(beforeWidth);
    const original = cabin.components.find((c) => c.id === room.id);
    expect(original?.type).toBe("room");
    if (original?.type === "room") {
      expect(original.width).toBe(beforeWidth);
    }
  });

  it("targetSurfaceOptions excludes roof for facade-attached components", () => {
    const options = targetSurfaceOptions(cabin);
    expect(options.every((ref) => !ref.endsWith(".roof"))).toBe(true);
    expect(options).toContain("main-room.front");
    expect(options).toContain("main-room.back");
    expect(options).toContain("main-room.left");
    expect(options).toContain("main-room.right");
  });

  it("setComponentMaterialOverride sets and clears overrides", () => {
    const room = cabin.components.find((c) => c.type === "room");
    expect(room).toBeDefined();
    const withOverride = setComponentMaterialOverride(cabin, room!.id, "wall", "glass");
    const comp = withOverride.components.find((c) => c.id === room!.id);
    expect(comp?.materials?.wall).toBe("glass");

    const cleared = setComponentMaterialOverride(withOverride, room!.id, "wall", undefined);
    const clearedComp = cleared.components.find((c) => c.id === room!.id);
    expect(clearedComp?.materials).toBeUndefined();
  });

  it("doorComponentIds lists door component ids", () => {
    const ids = doorComponentIds(cabin);
    expect(ids).toContain("front-door");
    expect(ids.length).toBeGreaterThan(0);
  });
});
