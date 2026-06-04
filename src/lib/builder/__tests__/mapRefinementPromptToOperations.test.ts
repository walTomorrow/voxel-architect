import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import { findPrimaryFrontWindowGroup, findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";

describe("mapRefinementPromptToOperations", () => {
  const cabin = clonePresetBlueprintV2("simple_cabin_v2");
  const porchHouse = clonePresetBlueprintV2("porch_house_v2");

  it("rejects wider porch requests", () => {
    const result = mapRefinementPromptToOperations("make the porch wider", porchHouse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/not supported yet/i);
    }
  });

  it("maps taller to room wall height", () => {
    const room = findRootRoom(cabin)!;
    const result = mapRefinementPromptToOperations("make it taller", cabin);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toMatchObject({
        op: "updateComponent",
        id: room.id,
        patch: { type: "room", wallHeight: room.wallHeight + 1 },
      });
    }
  });

  it("maps dark wood roof to palette", () => {
    const result = mapRefinementPromptToOperations("make the roof dark wood", cabin);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toEqual({
        op: "setMaterialPalette",
        patch: { roof: "oak_planks" },
      });
    }
  });

  it("maps more windows to the front window group only", () => {
    const windows = findPrimaryFrontWindowGroup(cabin)!;
    const result = mapRefinementPromptToOperations("add more windows", cabin);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toMatchObject({
        op: "updateComponent",
        id: windows.id,
        componentType: "window_group",
        patch: { type: "window_group", count: windows.count + 1 },
      });
    }
  });

  it("maps deeper porch on porch house preset", () => {
    const result = mapRefinementPromptToOperations("make the porch deeper", porchHouse);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]?.op).toBe("updateComponent");
    }
  });
});
