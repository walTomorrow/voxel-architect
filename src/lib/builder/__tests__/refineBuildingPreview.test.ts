import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { refineBuildingPreview } from "@/src/lib/builder/refineBuildingPreview";
import { findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";

describe("refineBuildingPreview", () => {
  it("refines wall height and regenerates blocks", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const room = findRootRoom(blueprint)!;
    const result = refineBuildingPreview({ prompt: "make it taller", blueprint });
    expect(result.ok).toBe(true);
    expect(result.toolKind).toBe("refine");
    expect(result.blockCount).toBeGreaterThan(0);
    expect(result.blueprint).toBeDefined();
    const updatedRoom = findRootRoom(result.blueprint!)!;
    expect(updatedRoom.wallHeight).toBe(room.wallHeight + 1);
  });

  it("fails cleanly for unsupported wider porch", () => {
    const blueprint = clonePresetBlueprintV2("porch_house_v2");
    const result = refineBuildingPreview({ prompt: "wider porch", blueprint });
    expect(result.ok).toBe(false);
    expect(result.toolKind).toBe("refine");
    expect(result.error).toMatch(/not supported/i);
  });
});
