import { afterEach, describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { findPorch, findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";
import { planAndRefineBuildingPreview } from "@/src/lib/builder/planAndRefineBuildingPreview";
import {
  planBlueprintOperationsWithLlm,
  setLlmPlannerForTests,
} from "@/src/lib/builder/planBlueprintOperationsWithLlm";

afterEach(() => {
  setLlmPlannerForTests(null);
});

function mockLlmSuccess() {
  let called = false;
  setLlmPlannerForTests(async () => {
    called = true;
    return {
      ok: true,
      operations: [{ op: "setMaterialPalette", patch: { roof: "slate_tiles" } }],
      rationaleSummary: "Mock LLM plan",
    };
  });
  return () => called;
}

function mockLlmUnsupported(reason: string) {
  let called = false;
  setLlmPlannerForTests(async () => {
    called = true;
    return {
      ok: false,
      unsupportedReason: reason,
      rejectionCode: "PLANNER_UNSUPPORTED" as const,
      rejectionDetail: reason,
    };
  });
  return () => called;
}

describe("planAndRefineBuildingPreview", () => {
  it("uses deterministic path in auto for literal commands", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const room = findRootRoom(blueprint)!;
    let llmCalled = false;
    setLlmPlannerForTests(async () => {
      llmCalled = true;
      return {
        ok: true,
        operations: [{ op: "setMaterialPalette", patch: { roof: "oak_planks" } }],
        rationaleSummary: "should not run",
      };
    });

    const result = await planAndRefineBuildingPreview({
      prompt: "make it taller",
      blueprint,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    expect(result.plannerPath).toBe("deterministic");
    expect(llmCalled).toBe(false);
    expect(findRootRoom(result.blueprint!)!.wallHeight).toBe(room.wallHeight + 1);
    expect(result.activityEvents.some((e) => e.label === "Matched deterministic edit")).toBe(true);
  });

  it("uses mocked LLM for semantic prompts without calling deterministic success", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const wasLlmCalled = mockLlmSuccess();

    const result = await planAndRefineBuildingPreview({
      prompt: "make it less squat",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.plannerPath).toBe("llm");
    expect(result.activityEvents.some((e) => e.label === "Semantic edit — using LLM planner")).toBe(
      true,
    );
    expect(result.activityEvents.some((e) => e.label === "Planned semantic edit with LLM")).toBe(
      true,
    );
  });

  it("routes combined literal+semantic prompts to LLM", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const wasLlmCalled = mockLlmSuccess();

    const result = await planAndRefineBuildingPreview({
      prompt: "make it taller and sturdier",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(true);
    expect(result.plannerPath).toBe("llm");
  });

  it("uses deterministic for porch depth", async () => {
    const blueprint = clonePresetBlueprintV2("porch_house_v2");
    const porch = findPorch(blueprint)!;
    let llmCalled = false;
    setLlmPlannerForTests(async () => {
      llmCalled = true;
      return {
        ok: true,
        operations: [{ op: "setMaterialPalette", patch: { roof: "oak_planks" } }],
        rationaleSummary: "should not run",
      };
    });

    const result = await planAndRefineBuildingPreview({
      prompt: "make the porch deeper",
      blueprint,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    expect(result.plannerPath).toBe("deterministic");
    expect(llmCalled).toBe(false);
    const updatedPorch = result.blueprint!.components.find((c) => c.id === porch.id);
    expect(updatedPorch?.type).toBe("porch");
    if (updatedPorch?.type === "porch") {
      expect(updatedPorch.depth).toBe(porch.depth + 1);
    }
  });

  it("uses deterministic for extend the porch", async () => {
    const blueprint = clonePresetBlueprintV2("porch_house_v2");
    const wasLlmCalled = mockLlmSuccess();

    const result = await planAndRefineBuildingPreview({
      prompt: "extend the porch",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(false);
    expect(result.plannerPath).toBe("deterministic");
  });

  it("routes structural unsupported prompts to LLM", async () => {
    const blueprint = clonePresetBlueprintV2("porch_house_v2");
    const wasLlmCalled = mockLlmUnsupported("Adding a porch is not supported yet.");

    const result = await planAndRefineBuildingPreview({
      prompt: "add a porch",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.plannerPath).toBe("llm");
    expect(result.rejectionCode).toBe("PLANNER_UNSUPPORTED");
    expect(
      result.activityEvents.some((e) =>
        e.label.includes("Rejected unsupported edit: Adding a porch is not supported yet."),
      ),
    ).toBe(true);
  });

  it("widens porch deterministically in auto mode", async () => {
    const blueprint = clonePresetBlueprintV2("porch_house_v2");
    const wasLlmCalled = mockLlmSuccess();

    const result = await planAndRefineBuildingPreview({
      prompt: "make the porch wider",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.plannerPath).toBe("deterministic");
  });

  it("routes add a second floor to LLM unsupported", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const wasLlmCalled = mockLlmUnsupported("Adding a second floor is not supported yet.");

    const result = await planAndRefineBuildingPreview({
      prompt: "add a second floor",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.rejectionCode).toBe("PLANNER_UNSUPPORTED");
  });

  it("uses deterministic for explicit oak roof", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const wasLlmCalled = mockLlmSuccess();

    const result = await planAndRefineBuildingPreview({
      prompt: "make the roof oak",
      blueprint,
      plannerMode: "auto",
    });
    expect(wasLlmCalled()).toBe(false);
    expect(result.plannerPath).toBe("deterministic");
    expect(result.blueprint?.materials.roof).toBe("oak_planks");
  });

  it("llm-only mode skips deterministic", async () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    let plannerCalled = false;
    setLlmPlannerForTests(async (input) => {
      plannerCalled = true;
      expect(input.userRequest).toContain("rustic");
      return {
        ok: true,
        operations: [{ op: "setMaterialPalette", patch: { wall: "cobblestone" } }],
        rationaleSummary: "Stone walls",
      };
    });

    const result = await planAndRefineBuildingPreview({
      prompt: "make it more rustic",
      blueprint,
      plannerMode: "llm",
    });
    expect(plannerCalled).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.plannerPath).toBe("llm");
  });
});

describe("planBlueprintOperationsWithLlm", () => {
  it("uses test override without network", async () => {
    setLlmPlannerForTests(async () => ({
      ok: false,
      unsupportedReason: "Not possible",
    }));
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const out = await planBlueprintOperationsWithLlm({
      userRequest: "add a second floor",
      blueprint,
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.failure.rejectionCode).toBe("PLANNER_UNSUPPORTED");
    }
  });
});
