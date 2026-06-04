import { afterEach, describe, expect, it, vi } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import {
  buildWorkersAiPlannerResponseFormat,
  PLANNER_RESPONSE_JSON_SCHEMA,
  plannerResponseFormatUsesJsonSchema,
} from "@/src/lib/builder/plannerResponseSchema";
import {
  detectDirectComponentRequest,
  isSemanticStyleTransformRequest,
} from "@/src/lib/builder/detectDirectComponentRequest";
import { validateOverbroadPlannerPlan } from "@/src/lib/builder/validateOverbroadPlannerPlan";
import {
  parsePlannerJsonResponse,
  validatePlannerJsonAndOperations,
} from "@/src/lib/builder/validatePlannerOperations";
import { isRepairablePlannerRejection } from "@/src/lib/builder/plannerRepair";
import { fetchPlannerText } from "@/src/lib/builder/callWorkersAiJsonPlanner";

describe("planner response_format / JSON schema", () => {
  it("uses json_schema response_format", () => {
    const fmt = buildWorkersAiPlannerResponseFormat();
    expect(fmt.type).toBe("json_schema");
    expect(plannerResponseFormatUsesJsonSchema()).toBe(true);
  });

  it("schema includes status and add/remove operations", () => {
    expect(PLANNER_RESPONSE_JSON_SCHEMA.properties.status).toBeDefined();
    const oneOf = PLANNER_RESPONSE_JSON_SCHEMA.properties.operations.items.oneOf as readonly {
      properties: { op: { enum: readonly string[] } };
    }[];
    const opEnums = oneOf.flatMap((s) => s.properties.op.enum);
    expect(opEnums).toContain("addComponent");
    expect(opEnums).toContain("removeComponent");
    expect(opEnums).not.toContain("setMaterialOverride");
  });

  it("addComponent schema requires componentType not full component", () => {
    const addSchema = (
      PLANNER_RESPONSE_JSON_SCHEMA.properties.operations.items.oneOf as readonly {
        properties: Record<string, unknown>;
      }[]
    ).find((s) => (s.properties.op as { enum: string[] }).enum[0] === "addComponent");
    expect(addSchema?.properties.componentType).toBeDefined();
    expect(addSchema?.properties.component).toBeUndefined();
  });
});

describe("parsePlannerJsonResponse", () => {
  it("parses valid ok response", () => {
    const raw = JSON.stringify({
      status: "ok",
      operations: [{ op: "removeComponent", id: "chimney" }],
      rationaleSummary: "Removed chimney",
    });
    const parsed = parsePlannerJsonResponse(raw);
    expect("error" in parsed).toBe(false);
  });

  it("parses valid unsupported response", () => {
    const parsed = parsePlannerJsonResponse(
      JSON.stringify({
        status: "unsupported",
        unsupportedReason: "Second floor not supported",
      }),
    );
    expect("error" in parsed).toBe(false);
    if (!("error" in parsed)) {
      expect(parsed.status).toBe("unsupported");
    }
  });
});

describe("validation diagnostics", () => {
  const workshop = clonePresetBlueprintV2("stone_workshop_v2");

  it("rejects addComponent missing componentType with specific message", () => {
    const result = validatePlannerJsonAndOperations(workshop, {
      status: "ok",
      operations: [
        { op: "addComponent", targetSurface: "main-room.front" },
      ] as unknown as import("@/src/lib/builder/blueprintOperationsV2").BlueprintOperationV2[],
      rationaleSummary: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectionDetail).toContain('required string field "componentType"');
    }
  });

  it("rejects updateComponent missing id", () => {
    const result = validatePlannerJsonAndOperations(workshop, {
      status: "ok",
      operations: [
        {
          op: "updateComponent",
          componentType: "roof",
          patch: { type: "roof", layers: 3 },
        },
      ] as unknown as import("@/src/lib/builder/blueprintOperationsV2").BlueprintOperationV2[],
      rationaleSummary: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectionDetail).toContain('required string field "id"');
    }
  });

  it("lists unknown roof patch fields", () => {
    const result = validatePlannerJsonAndOperations(workshop, {
      status: "ok",
      operations: [
        {
          op: "updateComponent",
          id: "main-roof",
          componentType: "roof",
          patch: { type: "roof", style: "rustic", description: "warm" },
        },
      ] as unknown as import("@/src/lib/builder/blueprintOperationsV2").BlueprintOperationV2[],
      rationaleSummary: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectionDetail).toContain("unknown fields");
      expect(result.rejectionDetail).toMatch(/style/);
    }
  });

  it("rejects full component object on addComponent", () => {
    const result = validatePlannerJsonAndOperations(workshop, {
      status: "ok",
      operations: [
        {
          op: "addComponent",
          component: { id: "front-porch", type: "porch" },
        },
      ] as unknown as import("@/src/lib/builder/blueprintOperationsV2").BlueprintOperationV2[],
      rationaleSummary: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectionDetail).toContain("cannot include a full");
    }
  });

  it("validates canonical add porch intent", () => {
    const result = validatePlannerJsonAndOperations(workshop, {
      status: "ok",
      operations: [
        {
          op: "addComponent",
          componentType: "porch",
          targetSurface: "main-room.front",
          placement: "center",
          options: { kind: "porch", depth: 2, widthMode: "door_only" },
        },
      ],
      rationaleSummary: "Added porch",
    });
    expect(result.ok).toBe(true);
  });
});

describe("minimum-change / overbroad", () => {
  it("detects direct add chimney request", () => {
    expect(detectDirectComponentRequest("add a chimney to the right side")).toEqual({
      kind: "add",
      componentType: "chimney",
    });
  });

  it("allows semantic multi-op requests", () => {
    expect(isSemanticStyleTransformRequest("make it more welcoming")).toBe(true);
    const over = validateOverbroadPlannerPlan("make it more welcoming", [
      {
        op: "addComponent",
        componentType: "porch",
        targetSurface: "main-room.front",
      },
      {
        op: "updateComponent",
        id: "front-windows",
        componentType: "window_group",
        patch: { type: "window_group", count: 3 },
      },
    ]);
    expect(over.ok).toBe(true);
  });

  it("rejects overbroad plan for direct add chimney", () => {
    const over = validateOverbroadPlannerPlan("add a chimney to the right", [
      {
        op: "addComponent",
        componentType: "chimney",
        targetSurface: "main-room.right",
      },
      { op: "setMaterialPalette", patch: { roof: "slate_tiles" } },
    ]);
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.rejection.code).toBe("OVERBROAD_OPERATION_PLAN");
    }
  });
});

describe("repairable rejection codes", () => {
  it("includes validation shape errors", () => {
    expect(isRepairablePlannerRejection("UNSUPPORTED_PATCH_FIELD")).toBe(true);
    expect(isRepairablePlannerRejection("INVALID_PLANNER_JSON")).toBe(true);
    expect(isRepairablePlannerRejection("OVERBROAD_OPERATION_PLAN")).toBe(true);
  });
});

describe("fetchPlannerText JSON Mode payload", () => {
  it("includes response_format with json_schema when Workers AI is configured", async () => {
    const hasConfig =
      Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) &&
      Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim());
    if (!hasConfig) {
      return;
    }

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        response_format?: { type: string };
      };
      expect(body.response_format?.type).toBe("json_schema");
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            response: JSON.stringify({
              status: "unsupported",
              unsupportedReason: "test",
            }),
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPlannerText("test prompt");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
