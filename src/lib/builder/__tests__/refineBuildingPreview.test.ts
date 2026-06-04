import { afterEach, describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";
import { planAndRefineBuildingPreview } from "@/src/lib/builder/planAndRefineBuildingPreview";
import { refineBuildingPreview } from "@/src/lib/builder/refineBuildingPreview";
import { setLlmPlannerForTests } from "@/src/lib/builder/planBlueprintOperationsWithLlm";

afterEach(() => {
  setLlmPlannerForTests(null);
});

describe("refineBuildingPreview", () => {
  it("refines wall height and regenerates blocks", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const room = findRootRoom(blueprint)!;
    const result = await refineBuildingPreview({ prompt: "make it taller", blueprint });
    expect(result.ok).toBe(true);
    expect(result.plannerPath).toBe("deterministic");
    expect(result.toolKind).toBe("refine");
    expect(result.blockCount).toBeGreaterThan(0);
    expect(result.blueprint).toBeDefined();
    const updatedRoom = findRootRoom(result.blueprint!)!;
    expect(updatedRoom.wallHeight).toBe(room.wallHeight + 1);
  });

  it("routes unsupported wider porch through LLM in auto mode", async () => {
    setLlmPlannerForTests(async () => ({
      ok: false,
      unsupportedReason: "Porch width changes are not supported yet.",
      rejectionCode: "PLANNER_UNSUPPORTED",
      rejectionDetail: "Porch width changes are not supported yet.",
    }));
    const blueprint = clonePresetBlueprintV2("porch_house_v2");
    const result = await planAndRefineBuildingPreview({
      prompt: "make the porch wider",
      blueprint,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(false);
    expect(result.toolKind).toBe("refine");
    expect(result.plannerPath).toBe("llm");
    expect(result.error).toMatch(/not supported/i);
  });
});
