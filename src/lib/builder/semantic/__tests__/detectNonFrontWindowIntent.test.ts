import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import { buildWindowOperationsFromIntent } from "@/src/lib/builder/windows/buildWindowOperationsFromIntent";
import { parseFacadeWindowIntent } from "@/src/lib/builder/windows/parseFacadeWindowIntent";
import { getWindowFacadeAffordances } from "@/src/lib/builder/windows/windowFacadeAffordances";
import { mentionsNonFrontWindowSurfaces } from "@/src/lib/builder/semantic/detectNonFrontWindowIntent";

describe("mentionsNonFrontWindowSurfaces", () => {
  it("detects right and left side requests", () => {
    expect(mentionsNonFrontWindowSurfaces("add a window to the right side")).toBe(true);
    expect(mentionsNonFrontWindowSurfaces("add windows on the left and right")).toBe(true);
    expect(mentionsNonFrontWindowSurfaces("put windows on the back")).toBe(true);
    expect(mentionsNonFrontWindowSurfaces("add more windows, but not on the front")).toBe(true);
  });

  it("does not flag generic front window add", () => {
    expect(mentionsNonFrontWindowSurfaces("add more windows")).toBe(false);
    expect(mentionsNonFrontWindowSurfaces("add windows to the front")).toBe(false);
  });
});

describe("mapRefinementPromptToOperations non-front guard", () => {
  const workshop = clonePresetBlueprintV2("stone_workshop_v2");

  it("does not map add windows on the right to front-window update", () => {
    const result = mapRefinementPromptToOperations(
      "add windows on the right side",
      workshop,
    );
    expect(result.ok).toBe(false);
  });

  it("window façade builder maps generic add windows to front", () => {
    const aff = getWindowFacadeAffordances(workshop);
    const intent = parseFacadeWindowIntent("add more windows", aff);
    expect(intent?.targetFaces).toContain("front");
    const built = buildWindowOperationsFromIntent(intent!, workshop, aff);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.operations[0]).toMatchObject({
        op: "updateComponent",
        id: "front-windows",
      });
    }
  });
});
