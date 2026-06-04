import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { isBlueprintValidationResultV2 } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import {
  materializeAddComponent,
  canAddComponent,
} from "@/src/lib/builder/componentOperationRegistry";
import { getBlueprintAffordancesForPlanner } from "@/src/lib/builder/getBlueprintAffordancesForPlanner";
import { shouldRunRefinementTool } from "@/src/lib/builder/shouldRunRefinementTool";
import { looksLikeDesignFeedback } from "@/src/lib/builder/shouldRunRefinementTool";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import { buildValidationFailureSuggestion } from "@/src/lib/builder/buildValidationFailureSuggestion";
import { findChimney } from "@/src/lib/builder/blueprintComponentIndex";
import { sanitizeWindowLayout } from "@/src/lib/blueprints/windowFacadeCapacity";
import { validatePlannerJsonAndOperations } from "@/src/lib/builder/validatePlannerOperations";

describe("remove component routing", () => {
  const phrases = [
    "remove the chimney",
    "could you remove the chimney?",
    "I changed my mind, could you remove the chimney?",
    "try again to remove the chimney",
    "delete the chimney",
    "take off the chimney",
  ];

  for (const phrase of phrases) {
    it(`routes "${phrase}" to refinement when blueprint exists`, () => {
      expect(shouldRunRefinementTool(phrase, true, false)).toBe(true);
    });
  }

  it("keeps design feedback chat-only", () => {
    expect(shouldRunRefinementTool("what do you think of this design?", true, false)).toBe(
      false,
    );
    expect(looksLikeDesignFeedback("what do you think of this design?")).toBe(true);
  });
});

describe("deterministic remove chimney", () => {
  it("maps remove chimney to removeComponent when chimney exists", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const mat = materializeAddComponent(bp, { op: "addComponent", componentType: "chimney" });
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    const added = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(added.ok).toBe(true);
    bp = added.blueprint!;
    expect(findChimney(bp)).toBeDefined();

    const mapped = mapRefinementPromptToOperations("could you remove the chimney?", bp);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.operations[0]?.op).toBe("removeComponent");
    }
  });
});

describe("window_group materialization defaults", () => {
  const workshop = () => clonePresetBlueprintV2("stone_workshop_v2");

  it("materializes valid right-side window_group with even layout", () => {
    const mat = materializeAddComponent(
      workshop(),
      {
        op: "addComponent",
        componentType: "window_group",
        targetSurface: "main-room.right",
      },
      { userPrompt: "add a window to the right side" },
    );
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    expect(mat.component.type).toBe("window_group");
    if (mat.component.type === "window_group") {
      expect(mat.component.layout).toBe("even");
      expect(mat.component.count).toBeGreaterThanOrEqual(1);
    }
    const applied = applyBlueprintOperationsV2(workshop(), [
      { op: "addComponent", component: mat.component },
    ]);
    expect(applied.ok).toBe(true);
    const validation = validateBlueprint(applied.blueprint!);
    expect(isBlueprintValidationResultV2(validation) && validation.ok).toBe(true);
    const blocks = generateStructure(
      isBlueprintValidationResultV2(validation)
        ? (validation.normalized ?? applied.blueprint!)
        : applied.blueprint!,
    );
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('singular "a window" uses count 1', () => {
    const mat = materializeAddComponent(
      workshop(),
      {
        op: "addComponent",
        componentType: "window_group",
        targetSurface: "main-room.right",
      },
      { userPrompt: "add a window to the right side of the building" },
    );
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    if (mat.component.type === "window_group") {
      expect(mat.component.count).toBe(1);
    }
  });

  it("sanitizes invalid layout aliases", () => {
    expect(sanitizeWindowLayout("centered", "main-room.right")).toBe("even");
    expect(sanitizeWindowLayout("symmetrical", "main-room.front")).toBe("symmetric");
  });

  it("rejects add when window_group already on surface", () => {
    const bp = workshop();
    expect(canAddComponent(bp, "window_group", "main-room.left").ok).toBe(false);
  });
});

describe("capacity-aware affordances", () => {
  it("front windows at capacity when count cannot increase further", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const max = getBlueprintAffordancesForPlanner(bp).windows.find((w) => w.face === "front")!
      .maxSlots;
    const bumped = applyBlueprintOperationsV2(bp, [
      {
        op: "updateComponent",
        id: "front-windows",
        componentType: "window_group",
        patch: { type: "window_group", count: max },
      },
    ]);
    expect(bumped.ok).toBe(true);
    bp = bumped.blueprint!;
    const a = getBlueprintAffordancesForPlanner(bp);
    expect(a.frontWindowsAtCapacity).toBe(true);
    const front = a.windows.find((w) => w.face === "front");
    expect(front?.atCapacity).toBe(true);
    expect(front?.canIncreaseCount).toBe(false);
    expect(a.canAdd.window_group.right).toBe(true);
  });

  it("shows removable chimney id after add", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const mat = materializeAddComponent(bp, { op: "addComponent", componentType: "chimney" });
    if (!mat.ok) return;
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    if (!applied.ok) return;
    const a = getBlueprintAffordancesForPlanner(applied.blueprint!);
    expect(a.hasChimney).toBe(true);
    expect(a.removableIds.chimney).toBeDefined();
    expect(a.canAdd.chimney).toBe(false);
    expect(a.chimney.canRemove).toBe(true);
  });

  it("workshop porch after add can widen from door_only", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const mat = materializeAddComponent(bp, { op: "addComponent", componentType: "porch" });
    if (!mat.ok) return;
    const added = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    if (!added.ok) return;
    const a = getBlueprintAffordancesForPlanner(added.blueprint!);
    expect(a.canAdd.porch).toBe(false);
    expect(a.porch.widthMode).toBe("door_only");
    expect(a.porch.canWiden).toBe(true);
  });
});

describe("validation failure suggestions", () => {
  it("suggests side windows when front exceeds capacity", () => {
    const bp = clonePresetBlueprintV2("stone_workshop_v2");
    const affordances = getBlueprintAffordancesForPlanner(bp);
    const hint = buildValidationFailureSuggestion(
      [
        {
          severity: "error",
          code: "window_count_exceeds_facade",
          message:
            "window_group count (4) exceeds façade capacity (~3 slots on main-room.front).",
          path: "components/0/count",
        },
      ],
      bp,
      affordances,
    );
    expect(hint).toMatch(/right|left|side/i);
  });
});

describe("welcoming planner respects affordances (mocked ops)", () => {
  it("allows side window add when front at capacity", () => {
    const bp = clonePresetBlueprintV2("stone_workshop_v2");
    const result = validatePlannerJsonAndOperations(
      bp,
      {
        status: "ok",
        operations: [
          {
            op: "addComponent",
            componentType: "window_group",
            targetSurface: "main-room.right",
            options: { kind: "window_group", count: 2, layout: "even" },
          },
        ],
        rationaleSummary: "Added right windows for a more welcoming facade.",
      },
      { userPrompt: "make it more welcoming" },
    );
    expect(result.ok).toBe(true);
  });

  it("clamps excessive front window count on apply", () => {
    const bp = clonePresetBlueprintV2("stone_workshop_v2");
    const max = getBlueprintAffordancesForPlanner(bp).windows.find((w) => w.face === "front")!
      .maxSlots;
    const applied = applyBlueprintOperationsV2(bp, [
      {
        op: "updateComponent",
        id: "front-windows",
        componentType: "window_group",
        patch: { type: "window_group", count: 99 },
      },
    ]);
    expect(applied.ok).toBe(true);
    const wg = applied.blueprint!.components.find((c) => c.id === "front-windows");
    expect(wg?.type === "window_group" && wg.count).toBe(max);
    const validation = validateBlueprint(applied.blueprint!);
    if (isBlueprintValidationResultV2(validation)) {
      expect(validation.ok).toBe(true);
    }
  });
});

describe("integration add chimney remove chimney", () => {
  it("add then remove chimney validates", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const mat = materializeAddComponent(bp, {
      op: "addComponent",
      componentType: "chimney",
      targetSurface: "main-room.left",
    });
    if (!mat.ok) return;
    const added = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(added.ok).toBe(true);
    bp = added.blueprint!;
    const chimney = findChimney(bp)!;
    const removed = applyBlueprintOperationsV2(bp, [
      { op: "removeComponent", id: chimney.id },
    ]);
    expect(removed.ok).toBe(true);
    expect(findChimney(removed.blueprint!)).toBeUndefined();
    const validation = validateBlueprint(removed.blueprint!);
    if (isBlueprintValidationResultV2(validation)) {
      expect(validation.ok).toBe(true);
    }
  });
});
