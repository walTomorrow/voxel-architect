import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import { materializeAddComponent } from "@/src/lib/builder/componentOperationRegistry";
import {
  getRichBlueprintAffordancesForPlanner,
  renderRichAffordancesText,
} from "@/src/lib/builder/semantic/richAffordances";
import { getBlueprintAffordancesForPlanner } from "@/src/lib/builder/getBlueprintAffordancesForPlanner";

describe("getRichBlueprintAffordancesForPlanner", () => {
  it("preserves legacy affordance fields", () => {
    const bp = clonePresetBlueprintV2("porch_house_v2");
    const legacy = getBlueprintAffordancesForPlanner(bp);
    const rich = getRichBlueprintAffordancesForPlanner(bp);
    expect(rich.hasPorch).toBe(legacy.hasPorch);
    expect(rich.canAdd.porch).toBe(legacy.canAdd.porch);
    expect(rich.windows.length).toBe(legacy.windows.length);
  });

  it("porch house: porch.add false because porch already exists", () => {
    const rich = getRichBlueprintAffordancesForPlanner(clonePresetBlueprintV2("porch_house_v2"));
    expect(rich.porchRich.add.available).toBe(false);
    expect(rich.porchRich.add.reason).toMatch(/already exists/i);
    expect(rich.canAdd.porch).toBe(false);
  });

  it("stone workshop: chimney absent and add available", () => {
    const rich = getRichBlueprintAffordancesForPlanner(clonePresetBlueprintV2("stone_workshop_v2"));
    expect(rich.chimneyRich.present).toBe(false);
    expect(rich.chimneyRich.add.available).toBe(true);
    expect(rich.canAdd.chimney).toBe(true);
    expect(rich.missing).toContain("no chimney");
  });

  it("front windows at capacity after bumping to max", () => {
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
    bp = bumped.blueprint!;
    const rich = getRichBlueprintAffordancesForPlanner(bp);
    const front = rich.windowsRich.find((w) => w.face === "front")!;
    expect(rich.frontWindowsAtCapacity).toBe(true);
    expect(front.increaseCount.available).toBe(false);
    expect(front.increaseCount.reason).toMatch(/capacity/i);
    const text = renderRichAffordancesText(rich);
    expect(text).toContain("frontWindowsAtCapacity=true");
    expect(text).toContain("window.front.increaseCount");
    expect(text).not.toContain("Legacy affordance");
  });

  it("workshop with chimney shows removable id", () => {
    let bp = clonePresetBlueprintV2("stone_workshop_v2");
    const mat = materializeAddComponent(bp, { op: "addComponent", componentType: "chimney" });
    if (!mat.ok) return;
    const applied = applyBlueprintOperationsV2(bp, [
      { op: "addComponent", component: mat.component },
    ]);
    if (!applied.ok) return;
    const rich = getRichBlueprintAffordancesForPlanner(applied.blueprint!);
    expect(rich.chimneyRich.add.available).toBe(false);
    expect(rich.chimneyRich.remove.available).toBe(true);
    expect(rich.removableIds.chimney).toBeDefined();
  });
});
