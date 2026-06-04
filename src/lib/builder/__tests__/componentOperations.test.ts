import { describe, expect, it } from "vitest";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { isBlueprintValidationResultV2 } from "@/src/lib/blueprints/validateBlueprint";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import {
  canAddComponent,
  materializeAddComponent,
} from "@/src/lib/builder/componentOperationRegistry";
import { findChimney, findPorch } from "@/src/lib/builder/blueprintComponentIndex";
import { getBlueprintAffordancesForPlanner } from "@/src/lib/builder/getBlueprintAffordancesForPlanner";
import { buildAllowedOperationsSchema } from "@/src/lib/builder/buildAllowedOperationsSchema";
import { validatePlannerOperations } from "@/src/lib/builder/validatePlannerOperations";
import { classifyRefinementPrompt } from "@/src/lib/builder/classifyRefinementPrompt";

describe("getBlueprintAffordancesForPlanner", () => {
  it("stone workshop can add porch and chimney", () => {
    const bp = clonePresetBlueprintV2("stone_workshop_v2");
    const a = getBlueprintAffordancesForPlanner(bp);
    expect(a.hasPorch).toBe(false);
    expect(a.hasChimney).toBe(false);
    expect(a.canAdd.porch).toBe(true);
    expect(a.canAdd.chimney).toBe(true);
    expect(a.missing).toContain("no porch");
  });
});

describe("component add/remove operations", () => {
  const workshop = () => clonePresetBlueprintV2("stone_workshop_v2");

  it("adds porch to stone workshop", () => {
    const bp = workshop();
    const mat = materializeAddComponent(bp, {
      op: "addComponent",
      componentType: "porch",
    });
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(applied.ok).toBe(true);
    expect(findPorch(applied.blueprint!)).toBeDefined();
  });

  it("rejects add porch when porch already exists", () => {
    const bp = clonePresetBlueprintV2("porch_house_v2");
    expect(canAddComponent(bp, "porch").ok).toBe(false);
  });

  it("removes porch and keeps step", () => {
    const bp = clonePresetBlueprintV2("porch_house_v2");
    const porch = findPorch(bp)!;
    const stepBefore = bp.components.some((c) => c.type === "step");
    const applied = applyBlueprintOperationsV2(bp, [{ op: "removeComponent", id: porch.id }]);
    expect(applied.ok).toBe(true);
    expect(findPorch(applied.blueprint!)).toBeUndefined();
    expect(applied.blueprint!.components.some((c) => c.type === "step")).toBe(stepBefore);
  });

  it("widens porch via widthMode full_facade", () => {
    const bp = clonePresetBlueprintV2("porch_house_v2");
    const porch = findPorch(bp)!;
    const applied = applyBlueprintOperationsV2(bp, [
      {
        op: "updateComponent",
        id: porch.id,
        componentType: "porch",
        patch: { type: "porch", widthMode: "full_facade", aroundDoor: null },
      },
    ]);
    expect(applied.ok).toBe(true);
    const updated = findPorch(applied.blueprint!)!;
    expect(updated.widthMode).toBe("full_facade");
    expect(updated.aroundDoor).toBeUndefined();
  });

  it("adds and removes chimney on simple cabin", () => {
    const bp = clonePresetBlueprintV2("simple_cabin_v2");
    expect(findChimney(bp)).toBeDefined();
    const removed = applyBlueprintOperationsV2(bp, [{ op: "removeComponent", id: "chimney" }]);
    expect(removed.ok).toBe(true);
    expect(findChimney(removed.blueprint!)).toBeUndefined();

    const mat = materializeAddComponent(removed.blueprint!, {
      op: "addComponent",
      componentType: "chimney",
    });
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    const readded = applyBlueprintOperationsV2(removed.blueprint!, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(readded.ok).toBe(true);
    expect(findChimney(readded.blueprint!)).toBeDefined();
  });

  it("adds window_group on left for workshop", () => {
    const bp = workshop();
    const mat = materializeAddComponent(
      bp,
      {
        op: "addComponent",
        componentType: "window_group",
        targetSurface: "main-room.right",
      },
      { userPrompt: "add windows on the right side" },
    );
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(applied.ok).toBe(true);
    const wg = applied.blueprint!.components.filter((c) => c.type === "window_group");
    expect(wg.some((w) => w.attach.targetSurface === "main-room.right")).toBe(true);
  });

  it("removes window_group by id", () => {
    const bp = workshop();
    const applied = applyBlueprintOperationsV2(bp, [{ op: "removeComponent", id: "left-windows" }]);
    expect(applied.ok).toBe(true);
    expect(applied.blueprint!.components.some((c) => c.id === "left-windows")).toBe(false);
  });

  it("rejects duplicate component id on add", () => {
    const bp = workshop();
    const mat = materializeAddComponent(bp, { op: "addComponent", componentType: "chimney" });
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(applied.ok).toBe(true);
    const dup = applyBlueprintOperationsV2(applied.blueprint!, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.code).toBe("DUPLICATE_COMPONENT");
    }
  });

  it("rejects removing room", () => {
    const bp = workshop();
    const applied = applyBlueprintOperationsV2(bp, [{ op: "removeComponent", id: "main-room" }]);
    expect(applied.ok).toBe(false);
    if (!applied.ok) {
      expect(applied.code).toBe("NOT_REMOVABLE");
    }
  });

  it("apply validate generate succeeds after add chimney to workshop", () => {
    const bp = workshop();
    const mat = materializeAddComponent(bp, { op: "addComponent", componentType: "chimney" });
    expect(mat.ok).toBe(true);
    if (!mat.ok) return;
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    expect(applied.ok).toBe(true);
    const validation = validateBlueprint(applied.blueprint!);
    expect(isBlueprintValidationResultV2(validation)).toBe(true);
    if (isBlueprintValidationResultV2(validation)) {
      expect(validation.ok).toBe(true);
      const blocks = generateStructure(validation.normalized ?? applied.blueprint!);
      expect(blocks.length).toBeGreaterThan(0);
    }
  });
});

describe("validatePlannerOperations add/remove", () => {
  const workshop = clonePresetBlueprintV2("stone_workshop_v2");

  it("schema includes add and remove op types", () => {
    const schema = buildAllowedOperationsSchema(workshop);
    expect(schema.allowedOpTypes).toContain("addComponent");
    expect(schema.allowedOpTypes).toContain("removeComponent");
    expect(schema.unsupported.some((u) => u.includes("add or remove components"))).toBe(false);
  });

  it("validates add chimney intent and materializes", () => {
    const result = validatePlannerOperations(workshop, [
      { op: "addComponent", componentType: "chimney", targetSurface: "main-room.back" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]?.op).toBe("addComponent");
      if (result.operations[0]?.op === "addComponent") {
        expect(result.operations[0].component.type).toBe("chimney");
      }
    }
  });

  it("rejects full component object from planner", () => {
    const result = validatePlannerOperations(workshop, [
      {
        op: "addComponent",
        component: { id: "x", type: "chimney", attach: { targetSurface: "main-room.back" } },
      },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid target surface", () => {
    const result = validatePlannerOperations(workshop, [
      {
        op: "addComponent",
        componentType: "window_group",
        targetSurface: "not-a-real-surface",
      },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects add porch when porch exists", () => {
    const porchHouse = clonePresetBlueprintV2("porch_house_v2");
    const result = validatePlannerOperations(porchHouse, [
      { op: "addComponent", componentType: "porch" },
    ]);
    expect(result.ok).toBe(false);
  });
});

describe("classifyRefinementPrompt component ops", () => {
  it("does not classify add porch as structural", () => {
    expect(classifyRefinementPrompt("add a porch")).not.toBe("structural");
  });
  it("still classifies second floor as structural", () => {
    expect(classifyRefinementPrompt("add a second floor")).toBe("structural");
  });
});
