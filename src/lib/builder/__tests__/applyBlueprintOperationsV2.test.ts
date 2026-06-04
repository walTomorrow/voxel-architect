import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import { findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";

describe("applyBlueprintOperationsV2", () => {
  it("applies setMaterialPalette", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const result = applyBlueprintOperationsV2(blueprint, [
      { op: "setMaterialPalette", patch: { roof: "slate_tiles" } },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blueprint?.materials.roof).toBe("slate_tiles");
    }
  });

  it("clamps room dimensions", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const room = findRootRoom(blueprint)!;
    const result = applyBlueprintOperationsV2(blueprint, [
      {
        op: "updateComponent",
        id: room.id,
        componentType: "room",
        patch: { type: "room", width: 99 },
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const updated = findRootRoom(result.blueprint!)!;
      expect(updated.width).toBe(17);
    }
  });

  it("rejects unknown component ids", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const result = applyBlueprintOperationsV2(blueprint, [
      {
        op: "updateComponent",
        id: "missing",
        componentType: "room",
        patch: { type: "room", width: 10 },
      },
    ]);
    expect(result.ok).toBe(false);
  });
});
