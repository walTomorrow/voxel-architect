import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlueprintMaterialPalette } from "@/src/lib/blueprints/types/materials";
import type { BlueprintOperationV2, ComponentPatchV2 } from "@/src/lib/builder/blueprintOperationsV2";
import type { GenericBuildingComponentTypeV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  buildAllowedOperationsSchema,
  PLANNER_PORCH_DEPTH,
  PLANNER_ROOF_LAYERS,
  PLANNER_ROOM_DEPTH,
  PLANNER_ROOM_HEIGHT,
  PLANNER_ROOM_WIDTH,
  PLANNER_WINDOW_COUNT,
} from "@/src/lib/builder/buildAllowedOperationsSchema";
import type { AllowedOperationsSchema, PlannerJsonResponse, PlannerResult } from "@/src/lib/builder/plannerTypes";
import { MAX_PLANNER_OPERATIONS } from "@/src/lib/builder/plannerTypes";
import { findComponentById } from "@/src/lib/builder/blueprintComponentIndex";
import { normalizePlannerOperations } from "@/src/lib/builder/normalizePlannerOperation";
import type { PlannerRejection, PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";

const PALETTE_KEYS = new Set(["wall", "floor", "roof", "window", "door", "accent"]);

type ValidationFail = { readonly ok: false; readonly rejection: PlannerRejection };

function reject(code: PlannerRejectionCode, detail: string): ValidationFail {
  return { ok: false, rejection: { code, detail } };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasOnlyKeys(obj: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(obj).every((k) => allowed.includes(k));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max;
}

function validateRoomPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "width", "depth", "wallHeight"];
  if (!hasOnlyKeys(patch, allowed)) {
    return reject("UNSUPPORTED_PATCH_FIELD", "room patch has unknown fields");
  }
  if (patch.type !== "room") {
    return reject("UNSUPPORTED_PATCH_FIELD", "room patch type must be room");
  }
  if (patch.width !== undefined) {
    if (!isFiniteNumber(patch.width) || !inRange(patch.width, PLANNER_ROOM_WIDTH.min, PLANNER_ROOM_WIDTH.max)) {
      return reject("UNSUPPORTED_PATCH_FIELD", "room width out of range");
    }
  }
  if (patch.depth !== undefined) {
    if (!isFiniteNumber(patch.depth) || !inRange(patch.depth, PLANNER_ROOM_DEPTH.min, PLANNER_ROOM_DEPTH.max)) {
      return reject("UNSUPPORTED_PATCH_FIELD", "room depth out of range");
    }
  }
  if (patch.wallHeight !== undefined) {
    if (
      !isFiniteNumber(patch.wallHeight) ||
      !inRange(patch.wallHeight, PLANNER_ROOM_HEIGHT.min, PLANNER_ROOM_HEIGHT.max)
    ) {
      return reject("UNSUPPORTED_PATCH_FIELD", "room wallHeight out of range");
    }
  }
  return null;
}

function validateRoofPatch(
  patch: Record<string, unknown>,
  schema: AllowedOperationsSchema,
): ValidationFail | null {
  const allowed = ["type", "kind", "layers", "overhang", "orientation"];
  if (!hasOnlyKeys(patch, allowed)) {
    return reject("UNSUPPORTED_PATCH_FIELD", "roof patch has unknown fields");
  }
  if (patch.type !== "roof") {
    return reject("UNSUPPORTED_PATCH_FIELD", "roof patch type must be roof");
  }
  if (patch.kind !== undefined && !schema.roofKinds.includes(String(patch.kind))) {
    return reject("UNSUPPORTED_PATCH_FIELD", "invalid roof kind");
  }
  if (patch.layers !== undefined) {
    if (!isFiniteNumber(patch.layers) || !inRange(patch.layers, PLANNER_ROOF_LAYERS.min, PLANNER_ROOF_LAYERS.max)) {
      return reject("UNSUPPORTED_PATCH_FIELD", "roof layers out of range");
    }
  }
  if (patch.overhang !== undefined && !isFiniteNumber(patch.overhang)) {
    return reject("UNSUPPORTED_PATCH_FIELD", "roof overhang must be a number");
  }
  if (patch.orientation !== undefined && !["front_back", "left_right"].includes(String(patch.orientation))) {
    return reject("UNSUPPORTED_PATCH_FIELD", "invalid roof orientation");
  }
  return null;
}

function validateWindowPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "count", "layout"];
  if (!hasOnlyKeys(patch, allowed)) {
    return reject("UNSUPPORTED_PATCH_FIELD", "window_group patch has unknown fields");
  }
  if (patch.type !== "window_group") {
    return reject("UNSUPPORTED_PATCH_FIELD", "window_group patch type must be window_group");
  }
  if (patch.count !== undefined) {
    if (!isFiniteNumber(patch.count) || !inRange(patch.count, PLANNER_WINDOW_COUNT.min, PLANNER_WINDOW_COUNT.max)) {
      return reject("UNSUPPORTED_PATCH_FIELD", "window count out of range");
    }
  }
  if (patch.layout !== undefined && !["symmetric", "even"].includes(String(patch.layout))) {
    return reject("UNSUPPORTED_PATCH_FIELD", "invalid window layout");
  }
  return null;
}

function validatePorchPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "depth"];
  if (!hasOnlyKeys(patch, allowed)) {
    return reject("UNSUPPORTED_PATCH_FIELD", "porch patch has unknown fields");
  }
  if (patch.type !== "porch") {
    return reject("UNSUPPORTED_PATCH_FIELD", "porch patch type must be porch");
  }
  if (patch.depth !== undefined) {
    if (!isFiniteNumber(patch.depth) || !inRange(patch.depth, PLANNER_PORCH_DEPTH.min, PLANNER_PORCH_DEPTH.max)) {
      return reject("UNSUPPORTED_PATCH_FIELD", "porch depth out of range");
    }
  }
  return null;
}

function validateChimneyPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "targetFace", "placementHorizontal"];
  if (!hasOnlyKeys(patch, allowed)) {
    return reject("UNSUPPORTED_PATCH_FIELD", "chimney patch has unknown fields");
  }
  if (patch.type !== "chimney") {
    return reject("UNSUPPORTED_PATCH_FIELD", "chimney patch type must be chimney");
  }
  if (patch.targetFace !== undefined && !["front", "back", "left", "right", "roof"].includes(String(patch.targetFace))) {
    return reject("UNSUPPORTED_PATCH_FIELD", "invalid chimney targetFace");
  }
  if (
    patch.placementHorizontal !== undefined &&
    !["left", "center", "right"].includes(String(patch.placementHorizontal))
  ) {
    return reject("UNSUPPORTED_PATCH_FIELD", "invalid chimney placementHorizontal");
  }
  return null;
}

function validateComponentPatch(
  patch: unknown,
  componentType: string,
  schema: AllowedOperationsSchema,
): ValidationFail | null {
  if (!isRecord(patch)) return reject("UNSUPPORTED_PATCH_FIELD", "patch must be an object");
  switch (componentType) {
    case "room":
      return validateRoomPatch(patch);
    case "roof":
      return validateRoofPatch(patch, schema);
    case "window_group":
      return validateWindowPatch(patch);
    case "porch":
      return validatePorchPatch(patch);
    case "chimney":
      return validateChimneyPatch(patch);
    default:
      return reject("UNSUPPORTED_PATCH_FIELD", `updateComponent not supported for type ${componentType}`);
  }
}

function validateOperation(
  op: unknown,
  blueprint: GenericBuildingBlueprintV2,
  schema: AllowedOperationsSchema,
): { ok: true; operation: BlueprintOperationV2 } | ValidationFail {
  if (!isRecord(op)) return reject("INVALID_PLANNER_JSON", "operation must be an object");
  const opKeys = Object.keys(op);
  if (op.op === "setMaterialPalette") {
    if (!opKeys.every((k) => ["op", "patch"].includes(k))) {
      return reject("UNSUPPORTED_PATCH_FIELD", "setMaterialPalette has unknown fields");
    }
    if (!isRecord(op.patch)) return reject("UNSUPPORTED_PATCH_FIELD", "patch must be an object");
    const patchKeys = Object.keys(op.patch);
    if (!patchKeys.every((k) => PALETTE_KEYS.has(k))) {
      return reject("UNSUPPORTED_PATCH_FIELD", "invalid palette key");
    }
    for (const value of Object.values(op.patch)) {
      if (typeof value !== "string" || !schema.materialKeys.includes(value)) {
        return reject("INVALID_MATERIAL", `invalid material "${String(value)}"`);
      }
    }
    return {
      ok: true,
      operation: {
        op: "setMaterialPalette",
        patch: op.patch as Partial<BlueprintMaterialPalette>,
      },
    };
  }

  if (op.op === "updateComponent") {
    const allowedKeys = ["op", "id", "componentType", "patch"] as const;
    const extra = opKeys.filter((k) => !allowedKeys.includes(k as (typeof allowedKeys)[number]));
    if (extra.length > 0) {
      return reject(
        "UNSUPPORTED_PATCH_FIELD",
        `updateComponent has unknown fields: ${extra.join(", ")}`,
      );
    }
    const id = op.id;
    const componentType = op.componentType;
    if (typeof id !== "string" || typeof componentType !== "string") {
      return reject("INVALID_PLANNER_JSON", "id and componentType must be strings");
    }
    const existing = findComponentById(blueprint, id);
    if (!existing) return reject("UNKNOWN_COMPONENT_ID", `unknown component id "${id}"`);
    if (existing.type !== componentType) {
      return reject(
        "COMPONENT_TYPE_MISMATCH",
        `component "${id}" is type "${existing.type}", not "${componentType}"`,
      );
    }
    const patchErr = validateComponentPatch(op.patch, componentType, schema);
    if (patchErr) return patchErr;
    return {
      ok: true,
      operation: {
        op: "updateComponent",
        id,
        componentType: componentType as GenericBuildingComponentTypeV2,
        patch: op.patch as ComponentPatchV2,
      },
    };
  }

  if (op.op === "setMaterialOverride") {
    return reject("INVALID_OP_TYPE", "setMaterialOverride is not allowed");
  }

  return reject("INVALID_OP_TYPE", `unsupported operation type "${String(op.op)}"`);
}

export function parsePlannerJsonResponse(
  raw: string,
): PlannerJsonResponse | { error: string; code: PlannerRejectionCode } {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    return { error: "Planner response is not valid JSON.", code: "JSON_PARSE_FAILED" };
  }
  if (!isRecord(parsed)) {
    return { error: "Planner JSON must be an object.", code: "INVALID_PLANNER_JSON" };
  }
  const keys = Object.keys(parsed);
  if (!keys.every((k) => ["status", "operations", "rationaleSummary", "unsupportedReason"].includes(k))) {
    return { error: "Planner JSON has unknown top-level fields.", code: "INVALID_PLANNER_JSON" };
  }
  const status = parsed.status;
  if (status === "unsupported") {
    if (typeof parsed.unsupportedReason !== "string" || parsed.unsupportedReason.trim().length === 0) {
      return { error: "unsupported status requires unsupportedReason.", code: "INVALID_PLANNER_JSON" };
    }
    return { status: "unsupported", unsupportedReason: parsed.unsupportedReason.trim() };
  }
  if (status !== "ok") {
    return { error: 'status must be "ok" or "unsupported".', code: "INVALID_PLANNER_JSON" };
  }
  if (!Array.isArray(parsed.operations)) {
    return { error: "operations must be an array.", code: "INVALID_PLANNER_JSON" };
  }
  if (typeof parsed.rationaleSummary !== "string" || parsed.rationaleSummary.trim().length === 0) {
    return { error: "rationaleSummary is required.", code: "INVALID_PLANNER_JSON" };
  }
  return {
    status: "ok",
    operations: parsed.operations as BlueprintOperationV2[],
    rationaleSummary: parsed.rationaleSummary.trim(),
  };
}

export function validatePlannerOperations(
  blueprint: GenericBuildingBlueprintV2,
  operations: readonly unknown[],
): { ok: true; operations: readonly BlueprintOperationV2[] } | ValidationFail {
  const schema = buildAllowedOperationsSchema(blueprint);
  if (operations.length === 0) {
    return reject("EMPTY_OPERATIONS", "operations must not be empty.");
  }
  if (operations.length > MAX_PLANNER_OPERATIONS) {
    return reject("TOO_MANY_OPERATIONS", `At most ${MAX_PLANNER_OPERATIONS} operations allowed.`);
  }

  const validated: BlueprintOperationV2[] = [];
  const normalized = normalizePlannerOperations(operations);
  for (const raw of normalized) {
    const result = validateOperation(raw, blueprint, schema);
    if (!result.ok) return result;
    validated.push(result.operation);
  }
  return { ok: true, operations: validated };
}

export function validatePlannerJsonAndOperations(
  blueprint: GenericBuildingBlueprintV2,
  json: PlannerJsonResponse,
): PlannerResult {
  if (json.status === "unsupported") {
    return {
      ok: false,
      unsupportedReason: json.unsupportedReason,
      rejectionCode: "PLANNER_UNSUPPORTED",
      rejectionDetail: json.unsupportedReason,
    };
  }
  const validated = validatePlannerOperations(blueprint, json.operations);
  if (!validated.ok) {
    return {
      ok: false,
      unsupportedReason: validated.rejection.detail,
      rejectionCode: validated.rejection.code,
      rejectionDetail: validated.rejection.detail,
    };
  }
  return {
    ok: true,
    operations: validated.operations,
    rationaleSummary: json.rationaleSummary,
  };
}
