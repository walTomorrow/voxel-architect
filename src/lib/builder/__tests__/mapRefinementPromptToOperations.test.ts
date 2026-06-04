import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import {
  findPorch,
  findPrimaryFrontWindowGroup,
  findRootRoom,
} from "@/src/lib/builder/blueprintComponentIndex";

describe("mapRefinementPromptToOperations", () => {
  const cabin = clonePresetBlueprintV2("simple_cabin_v2");
  const porchHouse = clonePresetBlueprintV2("porch_house_v2");

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

  it("does not map less squat deterministically", () => {
    const result = mapRefinementPromptToOperations("make it less squat", cabin);
    expect(result.ok).toBe(false);
  });

  it("maps explicit oak roof command", () => {
    const result = mapRefinementPromptToOperations("make the roof oak", cabin);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toEqual({
        op: "setMaterialPalette",
        patch: { roof: "oak_planks" },
      });
    }
  });

  it("does not map sturdier deterministically", () => {
    const workshop = clonePresetBlueprintV2("stone_workshop_v2");
    const result = mapRefinementPromptToOperations("make the workshop sturdier", workshop);
    expect(result.ok).toBe(false);
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
    const porch = findPorch(porchHouse)!;
    const result = mapRefinementPromptToOperations("make the porch deeper", porchHouse);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toMatchObject({
        op: "updateComponent",
        id: porch.id,
        componentType: "porch",
        patch: { type: "porch", depth: porch.depth + 1 },
      });
    }
  });

  it("maps extend the porch to porch depth increase", () => {
    const porch = findPorch(porchHouse)!;
    const result = mapRefinementPromptToOperations("extend the porch", porchHouse);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toMatchObject({
        id: porch.id,
        patch: { type: "porch", depth: porch.depth + 1 },
      });
    }
  });

  it("does not hard-reject wider porch (LLM path handles unsupported)", () => {
    const result = mapRefinementPromptToOperations("make the porch wider", porchHouse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toMatch(/not supported yet/i);
    }
  });

  it("maps gabled roof phrasing", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const result = mapRefinementPromptToOperations("give it a gabled roof", blueprint);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toMatchObject({
        op: "updateComponent",
        patch: { type: "roof", kind: "pitched_gable" },
      });
    }
  });
});
