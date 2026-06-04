import { describe, expect, it } from "vitest";
import { normalizePlannerOperation } from "@/src/lib/builder/normalizePlannerOperation";

describe("normalizePlannerOperation", () => {
  it("maps componentId and hoisted patch fields", () => {
    const normalized = normalizePlannerOperation({
      op: "updateComponent",
      componentId: "main-room",
      type: "room",
      wallHeight: 6,
    });
    expect(normalized).toEqual({
      op: "updateComponent",
      id: "main-room",
      componentType: "room",
      patch: { type: "room", wallHeight: 6 },
    });
  });

  it("maps materials alias for palette ops", () => {
    const normalized = normalizePlannerOperation({
      op: "setMaterialPalette",
      materials: { roof: "oak_planks" },
    });
    expect(normalized).toEqual({
      op: "setMaterialPalette",
      patch: { roof: "oak_planks" },
    });
  });

  it("unwraps nested updateComponent envelope", () => {
    const normalized = normalizePlannerOperation({
      updateComponent: {
        id: "main-roof",
        componentType: "roof",
        patch: { type: "roof", layers: 3 },
      },
    });
    expect(normalized).toEqual({
      op: "updateComponent",
      id: "main-roof",
      componentType: "roof",
      patch: { type: "roof", layers: 3 },
    });
  });

  it("strips unknown top-level fields via canonical rebuild", () => {
    const normalized = normalizePlannerOperation({
      op: "updateComponent",
      id: "main-room",
      componentType: "room",
      patch: { type: "room", wallHeight: 5 },
      rationale: "taller workshop",
      description: "extra",
    });
    expect(normalized).toEqual({
      op: "updateComponent",
      id: "main-room",
      componentType: "room",
      patch: { type: "room", wallHeight: 5 },
    });
  });
});
