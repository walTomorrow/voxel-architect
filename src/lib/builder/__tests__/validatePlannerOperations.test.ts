import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";
import {
  parsePlannerJsonResponse,
  validatePlannerOperations,
} from "@/src/lib/builder/validatePlannerOperations";

describe("parsePlannerJsonResponse", () => {
  it("parses ok JSON", () => {
    const raw = JSON.stringify({
      status: "ok",
      operations: [{ op: "setMaterialPalette", patch: { roof: "oak_planks" } }],
      rationaleSummary: "Wood roof",
    });
    const parsed = parsePlannerJsonResponse(raw);
    expect("error" in parsed).toBe(false);
    if (!("error" in parsed)) {
      expect(parsed.status).toBe("ok");
    }
  });

  it("rejects unknown top-level fields", () => {
    const parsed = parsePlannerJsonResponse(
      JSON.stringify({ status: "ok", operations: [], rationaleSummary: "x", extra: true }),
    );
    expect("error" in parsed).toBe(true);
  });
});

describe("validatePlannerOperations", () => {
  const blueprint = clonePresetBlueprintV2("simple_cabin_v2");

  it("accepts valid palette op", () => {
    const result = validatePlannerOperations(blueprint, [
      { op: "setMaterialPalette", patch: { roof: "slate_tiles" } },
    ]);
    expect(result.ok).toBe(true);
  });

  it("normalizes LLM alias fields before validation", () => {
    const room = findRootRoom(blueprint)!;
    const result = validatePlannerOperations(blueprint, [
      {
        op: "updateComponent",
        componentId: room.id,
        type: "room",
        wallHeight: room.wallHeight + 1,
      },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown component id", () => {
    const result = validatePlannerOperations(blueprint, [
      {
        op: "updateComponent",
        id: "missing-room",
        componentType: "room",
        patch: { type: "room", width: 10 },
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.code).toBe("UNKNOWN_COMPONENT_ID");
    }
  });

  it("rejects setMaterialOverride", () => {
    const result = validatePlannerOperations(blueprint, [
      {
        op: "setMaterialOverride",
        id: "main-room",
        materials: { wall: "oak_planks" },
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.code).toBe("INVALID_OP_TYPE");
    }
  });

  it("rejects more than 3 operations", () => {
    const ops = Array.from({ length: 4 }, () => ({
      op: "setMaterialPalette" as const,
      patch: { roof: "oak_planks" as const },
    }));
    const result = validatePlannerOperations(blueprint, ops);
    expect(result.ok).toBe(false);
  });
});
