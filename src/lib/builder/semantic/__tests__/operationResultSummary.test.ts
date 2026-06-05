import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import {
  buildAssistantSummaryFromOutcomes,
  summarizeOperationOutcomes,
} from "@/src/lib/builder/semantic/operationResultSummary";

describe("summarizeOperationOutcomes", () => {
  const workshop = () => clonePresetBlueprintV2("stone_workshop_v2");

  it("describes window count as total not delta", () => {
    const before = workshop();
    const op = {
      op: "updateComponent" as const,
      id: "front-windows",
      componentType: "window_group" as const,
      patch: { type: "window_group" as const, count: 3 },
    };
    const applied = applyBlueprintOperationsV2(before, [op]);
    expect(applied.ok).toBe(true);
    const outcomes = summarizeOperationOutcomes(before, applied.blueprint!, [op]);
    const win = outcomes.find((o) => o.field === "count");
    expect(win?.before).toBe(2);
    expect(win?.after).toBe(3);
    expect(win?.userFacingShort).toMatch(/3 total/i);
    expect(win?.userFacingShort).toMatch(/was 2/i);
    expect(win?.userFacingShort).not.toMatch(/two additional/i);
  });

  it("describes add component", () => {
    const before = workshop();
    const applied = applyBlueprintOperationsV2(before, [
      {
        op: "addComponent",
        component: {
          id: "chimney",
          type: "chimney",
          label: "Chimney",
          attach: { targetSurface: "main-room.back", placement: { horizontal: "center" } },
        },
      },
    ]);
    expect(applied.ok).toBe(true);
    const outcomes = summarizeOperationOutcomes(before, applied.blueprint!, [
      {
        op: "addComponent",
        component: {
          id: "chimney",
          type: "chimney",
          label: "Chimney",
          attach: { targetSurface: "main-room.back", placement: { horizontal: "center" } },
        },
      },
    ]);
    expect(outcomes[0]?.kind).toBe("added_component");
    expect(outcomes[0]?.userFacingShort).toContain("Added chimney");
  });

  it("buildAssistantSummaryFromOutcomes joins short lines", () => {
    const outcomes = summarizeOperationOutcomes(
      workshop(),
      workshop(),
      [],
    );
    const summary = buildAssistantSummaryFromOutcomes(outcomes, 1000, 0);
    expect(summary).toMatch(/1[,.]?000 blocks/);
  });
});
