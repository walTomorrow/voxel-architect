import { describe, expect, it } from "vitest";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { isBlueprintValidationResultV2 } from "@/src/lib/blueprints/validateBlueprint";
import { isAddComponentIntent } from "@/src/lib/builder/blueprintOperationsV2";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import { materializeAddComponent } from "@/src/lib/builder/componentOperationRegistry";
import { findPorch, findPrimaryFrontWindowGroup } from "@/src/lib/builder/blueprintComponentIndex";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import { planAndRefineBuildingPreview } from "@/src/lib/builder/planAndRefineBuildingPreview";
import { MAX_PLANNER_OPERATIONS } from "@/src/lib/builder/plannerTypes";
import { buildWindowFacadeAssistantSummary } from "@/src/lib/builder/semantic/operationResultSummary";
import { validatePlannerOperations } from "@/src/lib/builder/validatePlannerOperations";
import { buildWindowOperationsFromIntent } from "@/src/lib/builder/windows/buildWindowOperationsFromIntent";
import { parseFacadeWindowIntent } from "@/src/lib/builder/windows/parseFacadeWindowIntent";
import { getWindowFacadeAffordances } from "@/src/lib/builder/windows/windowFacadeAffordances";
import { validatePlanAgainstIntentScope } from "@/src/lib/builder/windows/validatePlanAgainstIntentScope";
import { resolveGenericBuildingV2 } from "@/src/lib/blueprints/resolveGenericBuildingV2";
import { validateGenericBuildingBlueprintV2 } from "@/src/lib/blueprints/validateGenericBuildingV2";
import { generateGenericBuildingV2 } from "@/src/lib/generation/generators/generateGenericBuildingV2";

const workshop = () => clonePresetBlueprintV2("stone_workshop_v2");

function workshopWithAllFaceWindows(): GenericBuildingBlueprintV2 {
  let bp = workshop();
  for (const face of ["right", "back"] as const) {
    const mat = materializeAddComponent(bp, {
      op: "addComponent",
      componentType: "window_group",
      targetSurface: `main-room.${face}`,
    });
    expect(mat.ok).toBe(true);
    if (!mat.ok) throw new Error(mat.reason);
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(applied.ok).toBe(true);
    bp = applied.blueprint!;
  }
  return bp;
}

function intentFor(prompt: string, bp = workshop()) {
  return parseFacadeWindowIntent(prompt, getWindowFacadeAffordances(bp));
}

function builtOps(prompt: string, bp = workshop()) {
  const aff = getWindowFacadeAffordances(bp);
  const intent = parseFacadeWindowIntent(prompt, aff);
  expect(intent).not.toBeNull();
  return buildWindowOperationsFromIntent(intent!, bp, aff);
}

describe("parseFacadeWindowIntent", () => {
  it("does not classify welcoming as window_only", () => {
    expect(intentFor("make it more welcoming")).toBeNull();
    expect(intentFor("make the entire workshop more welcoming")).toBeNull();
  });

  it("parses not-to-the-front exclusions", () => {
    const i = intentFor("add more windows but not to the front of the workshop");
    expect(i?.excludedFaces).toContain("front");
    expect(i?.targetFaces).not.toContain("front");
  });

  it("parses not-on-the-front exclusions", () => {
    const i = intentFor("add more windows, but not on the front");
    expect(i?.excludedFaces).toContain("front");
    expect(i?.targetFaces).not.toContain("front");
  });

  it("parses right side", () => {
    const i = intentFor("add a window to the right side");
    expect(i?.requestedFaces).toContain("right");
    expect(i?.targetFaces).toContain("right");
  });

  it("parses back", () => {
    const i = intentFor("put windows on the back");
    expect(i?.targetFaces).toContain("back");
  });

  it("parses left and right", () => {
    const i = intentFor("add windows to the left and right sides");
    expect(i?.targetFaces).toContain("left");
    expect(i?.targetFaces).toContain("right");
  });

  it("parses both sides phrasing", () => {
    const i = intentFor("add a window to both the left and right sides");
    expect(i?.targetFaces).toEqual(expect.arrayContaining(["left", "right"]));
  });

  it("parses front total count 1", () => {
    const i = intentFor("make the front only have one window please");
    expect(i?.targetFaces).toContain("front");
    expect(i?.countMode).toBe("total");
    expect(i?.requestedCount).toBe(1);
  });

  it("parses set front windows to 1", () => {
    const i = intentFor("set the front windows to 1");
    expect(i).not.toBeNull();
    expect(i?.countMode).toBe("total");
    expect(i?.requestedCount).toBe(1);
  });

  it("parses glass pane treatment", () => {
    const i = intentFor("add glass pane windows on the left");
    expect(i?.windowTreatment).toBe("glass_pane");
  });

  it("parses open treatment", () => {
    const i = intentFor("add open windows on the back");
    expect(i?.windowTreatment).toBe("open");
  });

  it("parses remove all windows", () => {
    const i = intentFor("remove all of the windows");
    expect(i?.removeAllWindows).toBe(true);
    expect(i?.confidence).toBe("high");
  });

  it("parses no-windows phrasing", () => {
    expect(intentFor("I want the walls to have no windows")?.removeAllWindows).toBe(true);
    expect(intentFor("make the house have no windows")?.removeAllWindows).toBe(true);
  });

  it("parses mixed remove sides and add back", () => {
    const i = intentFor("remove the side windows and add a window to the back");
    expect(i?.removeFaces).toEqual(expect.arrayContaining(["left", "right"]));
    expect(i?.addOrUpdateFaces).toContain("back");
  });

  it("parses move front to sides", () => {
    const i = intentFor("move the windows from the front to the sides");
    expect(i?.removeFaces).toContain("front");
    expect(i?.addOrUpdateFaces).toEqual(expect.arrayContaining(["left", "right"]));
  });

  it("parses take off front and put on back", () => {
    const i = intentFor("take the windows off the front and put them on the back");
    expect(i?.removeFaces).toContain("front");
    expect(i?.addOrUpdateFaces).toContain("back");
  });

  it("parses remove all and add two to back", () => {
    const i = intentFor("remove all windows and add two windows to the back");
    expect(i?.removeAllWindows).toBe(true);
    expect(i?.addOrUpdateFaces).toContain("back");
    expect(i?.requestedCount).toBe(2);
  });

  it("parses remove all and then add one to left and right side", () => {
    const i = intentFor(
      "remove all windows and then add one to the left and right side of the building",
    );
    expect(i?.removeAllWindows).toBe(true);
    expect(i?.addOrUpdateFaces).toEqual(expect.arrayContaining(["left", "right"]));
    expect(i?.perFaceRequestedCounts?.left).toBe(1);
    expect(i?.perFaceRequestedCounts?.right).toBe(1);
  });

  it("parses no front windows but one on each side", () => {
    const i = intentFor("make there be no front windows, but add one window on each side");
    expect(i?.removeFaces).toContain("front");
    expect(i?.addOrUpdateFaces).toEqual(expect.arrayContaining(["left", "right"]));
    expect(i?.perFaceRequestedCounts?.left).toBe(1);
    expect(i?.perFaceRequestedCounts?.right).toBe(1);
  });
});

describe("buildWindowOperationsFromIntent", () => {
  it("add more windows but not front — no front op", () => {
    const result = builtOps("add more windows but not to the front");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const touchesFront = result.operations.some(
      (op) =>
        op.op === "updateComponent" &&
        op.id === "front-windows",
    );
    expect(touchesFront).toBe(false);
  });

  it("add a window to the right side", () => {
    const result = builtOps("add a window to the right side");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.operations.some(
        (op) => isAddComponentIntent(op) && op.targetSurface === "main-room.right",
      ),
    ).toBe(true);
  });

  it("add a window to the back", () => {
    const result = builtOps("add a window to the back");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.operations.some(
        (op) => isAddComponentIntent(op) && op.targetSurface === "main-room.back",
      ),
    ).toBe(true);
  });

  it("left and right produces two operations", () => {
    const result = builtOps("add windows to the left and right sides");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations.length).toBe(2);
    const touchesLeft = result.operations.some(
      (op) =>
        (isAddComponentIntent(op) && op.targetSurface === "main-room.left") ||
        (op.op === "updateComponent" && op.id === "left-windows"),
    );
    const touchesRight = result.operations.some(
      (op) => isAddComponentIntent(op) && op.targetSurface === "main-room.right",
    );
    expect(touchesLeft).toBe(true);
    expect(touchesRight).toBe(true);
  });

  it("make the front only have one window — single front update", () => {
    const result = builtOps("make the front only have one window please");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations.length).toBe(1);
    expect(result.operations[0]).toMatchObject({
      op: "updateComponent",
      id: "front-windows",
      patch: { type: "window_group", count: 1 },
    });
  });

  it("new window_group defaults to glass_block in materialized component", async () => {
    const bp = workshop();
    const refined = await planAndRefineBuildingPreview({
      prompt: "add a window to the right side",
      blueprint: bp,
      plannerMode: "auto",
    });
    expect(refined.ok).toBe(true);
    if (!refined.ok) return;
    const wg = refined.blueprint!.components.find((c) => c.id === "right-windows");
    expect(wg?.type === "window_group" && wg.windowTreatment).toBe("glass_block");
  });

  it("remove all windows produces remove ops only", () => {
    const bp = workshopWithAllFaceWindows();
    const result = builtOps("remove all windows", bp);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations.length).toBe(4);
    expect(result.operations.every((op) => op.op === "removeComponent")).toBe(true);
  });

  it("mixed remove sides and add back", () => {
    const bp = workshopWithAllFaceWindows();
    const result = builtOps("remove the side windows and add a window to the back", bp);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations.filter((op) => op.op === "removeComponent").length).toBe(2);
    expect(
      result.operations.some(
        (op) =>
          (isAddComponentIntent(op) && op.targetSurface === "main-room.back") ||
          (op.op === "updateComponent" && op.id === "back-windows"),
      ),
    ).toBe(true);
  });

  it("move front to sides removes front and adds left/right", () => {
    const result = builtOps("move the windows from the front to the sides");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations[0]).toMatchObject({ op: "removeComponent", id: "front-windows" });
    expect(result.operations.length).toBeGreaterThanOrEqual(3);
  });

  it("remove all and then add one to left and right side", () => {
    const bp = workshopWithAllFaceWindows();
    const result = builtOps(
      "remove all windows and then add one to the left and right side of the building",
      bp,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations.filter((op) => op.op === "removeComponent").length).toBe(4);
    const touchesLeft = result.operations.some(
      (op) =>
        (isAddComponentIntent(op) && op.targetSurface === "main-room.left") ||
        (op.op === "updateComponent" && op.id === "left-windows"),
    );
    const touchesRight = result.operations.some(
      (op) =>
        (isAddComponentIntent(op) && op.targetSurface === "main-room.right") ||
        (op.op === "updateComponent" && op.id === "right-windows"),
    );
    expect(touchesLeft).toBe(true);
    expect(touchesRight).toBe(true);
  });

  it("remove all and add two to back", () => {
    const bp = workshopWithAllFaceWindows();
    const result = builtOps("remove all windows and add two windows to the back", bp);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations.filter((op) => op.op === "removeComponent").length).toBe(4);
    const backOp = result.operations.find(
      (op) =>
        (isAddComponentIntent(op) && op.targetSurface === "main-room.back") ||
        (op.op === "updateComponent" && op.id === "back-windows"),
    );
    expect(backOp).toBeDefined();
    if (backOp?.op === "updateComponent" && backOp.patch.type === "window_group") {
      expect(backOp.patch.count).toBe(2);
    } else if (
      backOp &&
      isAddComponentIntent(backOp) &&
      backOp.options?.kind === "window_group"
    ) {
      expect(backOp.options.count).toBe(2);
    }
  });

  it("no front windows but one on each side", () => {
    const result = builtOps("make there be no front windows, but add one window on each side");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations[0]).toMatchObject({ op: "removeComponent", id: "front-windows" });
    expect(result.operations.length).toBe(3);
  });

  it("glass pane intent materializes glass_pane", async () => {
    const refined = await planAndRefineBuildingPreview({
      prompt: "add glass pane windows on the back",
      blueprint: workshop(),
      plannerMode: "auto",
    });
    expect(refined.ok).toBe(true);
    if (!refined.ok) return;
    const wg = refined.blueprint!.components.find(
      (c) => c.type === "window_group" && c.attach.targetSurface === "main-room.back",
    );
    expect(wg?.type === "window_group" && wg.windowTreatment).toBe("glass_pane");
  });
});

describe("operation cap", () => {
  it("window_det can remove 4 window groups in one request", async () => {
    const bp = workshopWithAllFaceWindows();
    const result = await planAndRefineBuildingPreview({
      prompt: "remove all of the windows",
      blueprint: bp,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plannerPath).toBe("window_det");
    expect(result.blueprint!.components.some((c) => c.type === "window_group")).toBe(false);
  });

  it("LLM planner MAX_PLANNER_OPERATIONS remains unchanged", () => {
    expect(MAX_PLANNER_OPERATIONS).toBe(3);
    const bp = workshopWithAllFaceWindows();
    const ops = bp.components
      .filter((c) => c.type === "window_group")
      .map((c) => ({ op: "removeComponent" as const, id: c.id }));
    const capped = validatePlannerOperations(bp, ops);
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.rejection.code).toBe("TOO_MANY_OPERATIONS");

    const uncapped = validatePlannerOperations(bp, ops, { skipOperationCountCap: true });
    expect(uncapped.ok).toBe(true);
  });
});

describe("validatePlanAgainstIntentScope", () => {
  it("rejects porch removal on narrow front window request", () => {
    const intent = intentFor("make the front only have one window");
    const scope = validatePlanAgainstIntentScope(
      [
        { op: "updateComponent", id: "front-windows", componentType: "window_group", patch: { type: "window_group", count: 1 } },
        { op: "removeComponent", id: "front-porch" },
      ],
      intent,
      workshop(),
    );
    expect(scope.ok).toBe(false);
  });

  it("allows remove front and add back", () => {
    const intent = intentFor("remove the front windows and add a window to the back");
    const scope = validatePlanAgainstIntentScope(
      [
        { op: "removeComponent", id: "front-windows" },
        {
          op: "addComponent",
          componentType: "window_group",
          targetSurface: "main-room.back",
          options: { kind: "window_group", count: 1 },
        },
      ],
      intent,
      workshop(),
    );
    expect(scope.ok).toBe(true);
  });

  it("rejects porch removal on mixed window request", () => {
    const intent = intentFor("remove the side windows and add a window to the back");
    const scope = validatePlanAgainstIntentScope(
      [
        { op: "removeComponent", id: "left-windows" },
        { op: "removeComponent", id: "front-porch" },
      ],
      intent,
      workshopWithAllFaceWindows(),
    );
    expect(scope.ok).toBe(false);
  });
});

describe("window façade summaries", () => {
  it("side removal notes unchanged faces", async () => {
    const bp = workshopWithAllFaceWindows();
    const result = await planAndRefineBuildingPreview({
      prompt: "remove the side windows",
      blueprint: bp,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assistantSummary).toMatch(/left and right/i);
    expect(result.assistantSummary).toMatch(/unchanged/i);
  });

  it("remove all summary", async () => {
    const bp = workshopWithAllFaceWindows();
    const result = await planAndRefineBuildingPreview({
      prompt: "remove all windows",
      blueprint: bp,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assistantSummary).toMatch(/Removed all window groups/i);
  });

  it("mixed remove and add summary", () => {
    const before = workshop();
    const after = workshop();
    const ops = [
      { op: "removeComponent" as const, id: "front-windows" },
      {
        op: "addComponent" as const,
        component: {
          id: "back-windows",
          type: "window_group" as const,
          label: "Back windows",
          attach: {
            targetSurface: "main-room.back" as const,
            placement: { horizontal: "center" as const },
          },
          count: 2,
          layout: "symmetric" as const,
          heightBand: "auto" as const,
          windowTreatment: "glass_block" as const,
        },
      },
    ];
    const applied = applyBlueprintOperationsV2(before, ops);
    const summary = buildWindowFacadeAssistantSummary(before, applied.blueprint!, ops);
    expect(summary).toMatch(/Removed the front window group/i);
    expect(summary).toMatch(/back window group/i);
  });
});

describe("mapRefinementPromptToOperations front guard", () => {
  it("does not map not-to-front more windows to front", () => {
    const result = mapRefinementPromptToOperations(
      "add more windows but not to the front",
      workshop(),
    );
    expect(result.ok).toBe(false);
  });
});

describe("planAndRefineBuildingPreview window_det", () => {
  it("refines not-front without front bump", async () => {
    const result = await planAndRefineBuildingPreview({
      prompt: "add more windows but not to the front",
      blueprint: workshop(),
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plannerPath).toBe("window_det");
    const front = result.blueprint!.components.find((c) => c.id === "front-windows");
    expect(front?.type === "window_group" && front.count).toBe(2);
  });

  it("front only one window keeps porch", async () => {
    const bp = clonePresetBlueprintV2("porch_house_v2");
    const result = await planAndRefineBuildingPreview({
      prompt: "make the front only have one window please",
      blueprint: bp,
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findPorch(result.blueprint!)).toBeDefined();
    const front = findPrimaryFrontWindowGroup(result.blueprint!);
    expect(front?.count).toBe(1);
  });

  it("left and right uses window_det with two ops path", async () => {
    const result = await planAndRefineBuildingPreview({
      prompt: "add windows to the left and right sides",
      blueprint: workshop(),
      plannerMode: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plannerPath).toBe("window_det");
    expect(result.blueprint!.components.some((c) => c.id === "left-windows")).toBe(true);
    expect(result.blueprint!.components.some((c) => c.id === "right-windows")).toBe(true);
  });
});

describe("windowTreatment generation", () => {
  it("glass_block emits full blocks without pane shape", () => {
    const cloned = structuredClone(workshop());
    const bp = {
      ...cloned,
      components: cloned.components.map((c) =>
        c.id === "front-windows" && c.type === "window_group"
          ? { ...c, windowTreatment: "glass_block" as const }
          : c,
      ),
    };
    const validation = validateGenericBuildingBlueprintV2(bp);
    expect(validation.ok).toBe(true);
    const resolved = resolveGenericBuildingV2(validation.normalized!);
    const blocks = generateGenericBuildingV2(resolved);
    const windowBlocks = blocks.filter((b) => b.blockTypeId === resolved.materials.window);
    expect(windowBlocks.length).toBeGreaterThan(0);
    expect(windowBlocks.every((b) => b.shapeKind !== "pane")).toBe(true);
  });

  it("open treatment emits no window fill blocks", async () => {
    const refined = await planAndRefineBuildingPreview({
      prompt: "add open windows on the back",
      blueprint: workshop(),
      plannerMode: "auto",
    });
    expect(refined.ok).toBe(true);
    if (!refined.ok) return;
    const wg = refined.blueprint!.components.find(
      (c) => c.type === "window_group" && c.attach.targetSurface === "main-room.back",
    );
    expect(wg?.type === "window_group" && wg.windowTreatment).toBe("open");
    const windowBlocks = refined.blocks!.filter(
      (b) => b.blockTypeId === refined.blueprint!.materials.window,
    );
    expect(windowBlocks.length).toBe(0);
  });
});
