import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlueprintMaterialPalette } from "@/src/lib/blueprints/types/materials";
import type { BlueprintOperationV2, ComponentPatchV2 } from "@/src/lib/builder/blueprintOperationsV2";
import type { AddableComponentKind } from "@/src/lib/builder/blueprintOperationsV2";
import { isAddComponentIntent } from "@/src/lib/builder/blueprintOperationsV2";
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
import {
  canAddComponent,
  canRemoveComponent,
  normalizeAddOptions,
} from "@/src/lib/builder/componentOperationRegistry";
import { materializePlannerOperations } from "@/src/lib/builder/materializePlannerOperations";
import type { ApplyableBlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import type { PlannerRejection, PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import { validateOverbroadPlannerPlan } from "@/src/lib/builder/validateOverbroadPlannerPlan";

const PALETTE_KEYS = new Set(["wall", "floor", "roof", "window", "door", "accent"]);

type ValidationFail = { readonly ok: false; readonly rejection: PlannerRejection };

function reject(code: PlannerRejectionCode, detail: string): ValidationFail {
  return { ok: false, rejection: { code, detail } };
}

function unknownFieldsMessage(context: string, extra: readonly string[]): string {
  return `${context} contains unknown fields: ${extra.join(", ")}`;
}

function rejectUnknownFields(
  code: PlannerRejectionCode,
  context: string,
  obj: Record<string, unknown>,
  allowed: readonly string[],
): ValidationFail | null {
  const extra = Object.keys(obj).filter((k) => !allowed.includes(k));
  if (extra.length > 0) {
    return reject(code, unknownFieldsMessage(context, extra));
  }
  return null;
}

function requireStringField(
  value: unknown,
  opName: string,
  field: string,
  code: PlannerRejectionCode = "INVALID_PLANNER_JSON",
): ValidationFail | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return reject(code, `${opName} is missing required string field "${field}"`);
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max;
}

function validateRoomPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "width", "depth", "wallHeight"] as const;
  const unk = rejectUnknownFields("UNSUPPORTED_PATCH_FIELD", "room patch", patch, allowed);
  if (unk) return unk;
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
  const allowed = ["type", "kind", "layers", "overhang", "orientation"] as const;
  const unk = rejectUnknownFields("UNSUPPORTED_PATCH_FIELD", "roof patch", patch, allowed);
  if (unk) return unk;
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
  const allowed = ["type", "count", "layout"] as const;
  const unk = rejectUnknownFields("UNSUPPORTED_PATCH_FIELD", "window_group patch", patch, allowed);
  if (unk) return unk;
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

const ADDABLE_KINDS: readonly AddableComponentKind[] = ["porch", "chimney", "window_group"];

const SURFACE_REF_PATTERN = /^[a-z0-9-]+\.(front|back|left|right|roof)$/;

function validatePorchPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "depth", "widthMode", "aroundDoor"] as const;
  const unk = rejectUnknownFields("UNSUPPORTED_PATCH_FIELD", "porch patch", patch, allowed);
  if (unk) return unk;
  if (patch.type !== "porch") {
    return reject("UNSUPPORTED_PATCH_FIELD", "porch patch type must be porch");
  }
  if (patch.depth !== undefined) {
    if (!isFiniteNumber(patch.depth) || !inRange(patch.depth, PLANNER_PORCH_DEPTH.min, PLANNER_PORCH_DEPTH.max)) {
      return reject("UNSUPPORTED_PATCH_FIELD", "porch depth out of range");
    }
  }
  if (patch.widthMode !== undefined && patch.widthMode !== "door_only" && patch.widthMode !== "full_facade") {
    return reject("UNSUPPORTED_PATCH_FIELD", "invalid porch widthMode");
  }
  if (patch.aroundDoor !== undefined && patch.aroundDoor !== null && typeof patch.aroundDoor !== "string") {
    return reject("UNSUPPORTED_PATCH_FIELD", "porch aroundDoor must be a string or null");
  }
  return null;
}

function validateChimneyPatch(patch: Record<string, unknown>): ValidationFail | null {
  const allowed = ["type", "targetFace", "placementHorizontal"] as const;
  const unk = rejectUnknownFields("UNSUPPORTED_PATCH_FIELD", "chimney patch", patch, allowed);
  if (unk) return unk;
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
    const unk = rejectUnknownFields(
      "UNSUPPORTED_PATCH_FIELD",
      "setMaterialPalette",
      op,
      ["op", "patch"],
    );
    if (unk) return unk;
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
    const unk = rejectUnknownFields(
      "UNSUPPORTED_PATCH_FIELD",
      "updateComponent",
      op,
      ["op", "id", "componentType", "patch"],
    );
    if (unk) return unk;

    const idErr = requireStringField(op.id, "updateComponent", "id");
    if (idErr) return idErr;
    const typeErr = requireStringField(op.componentType, "updateComponent", "componentType");
    if (typeErr) return typeErr;
    if (!isRecord(op.patch)) {
      return reject("INVALID_PLANNER_JSON", 'updateComponent is missing required object field "patch"');
    }

    const id = op.id as string;
    const componentType = op.componentType as string;
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

  if (op.op === "addComponent") {
    if ("component" in op) {
      return reject(
        "INVALID_ADD_TYPE",
        'addComponent cannot include a full "component" object; use componentType + targetSurface + options',
      );
    }
    const unk = rejectUnknownFields(
      "UNSUPPORTED_PATCH_FIELD",
      "addComponent",
      op,
      ["op", "componentType", "id", "targetSurface", "placement", "options"],
    );
    if (unk) return unk;

    const typeErr = requireStringField(
      op.componentType,
      "addComponent",
      "componentType",
      "INVALID_ADD_TYPE",
    );
    if (typeErr) return typeErr;

    const componentType = op.componentType as string;
    if (!ADDABLE_KINDS.includes(componentType as AddableComponentKind)) {
      return reject(
        "INVALID_ADD_TYPE",
        "addComponent must use componentType: porch | chimney | window_group",
      );
    }
    const targetSurface =
      typeof op.targetSurface === "string" ? op.targetSurface : undefined;
    if (targetSurface !== undefined && !SURFACE_REF_PATTERN.test(targetSurface)) {
      return reject("INVALID_SURFACE", `invalid targetSurface "${targetSurface}"`);
    }
    if (
      op.placement !== undefined &&
      !["left", "center", "right"].includes(String(op.placement))
    ) {
      return reject("UNSUPPORTED_PATCH_FIELD", "invalid placement");
    }
    const can = canAddComponent(
      blueprint,
      componentType as AddableComponentKind,
      targetSurface as import("@/src/lib/blueprints/types/genericBuildingV2").RoomSurfaceRef | undefined,
    );
    if (!can.ok) {
      return reject("ADD_NOT_ALLOWED", can.reason);
    }
    const options = normalizeAddOptions(
      op.options,
      componentType as AddableComponentKind,
      targetSurface as import("@/src/lib/blueprints/types/genericBuildingV2").RoomSurfaceRef | undefined,
    );
    return {
      ok: true,
      operation: {
        op: "addComponent",
        componentType: componentType as AddableComponentKind,
        ...(typeof op.id === "string" ? { id: op.id } : {}),
        ...(targetSurface ? { targetSurface: targetSurface as import("@/src/lib/blueprints/types/genericBuildingV2").RoomSurfaceRef } : {}),
        ...(op.placement === "left" || op.placement === "center" || op.placement === "right"
          ? { placement: op.placement }
          : {}),
        ...(options ? { options } : {}),
      },
    };
  }

  if (op.op === "removeComponent") {
    const unk = rejectUnknownFields("UNSUPPORTED_PATCH_FIELD", "removeComponent", op, ["op", "id"]);
    if (unk) return unk;

    const idRaw = op.id ?? op.componentId;
    const idErr = requireStringField(idRaw, "removeComponent", "id");
    if (idErr) return idErr;
    const id = idRaw as string;
    const can = canRemoveComponent(blueprint, id);
    if (!can.ok) {
      return reject(can.reason.includes("cannot be removed") ? "NOT_REMOVABLE" : "UNKNOWN_COMPONENT_ID", can.reason);
    }
    return {
      ok: true,
      operation: { op: "removeComponent", id },
    };
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
  options?: { userPrompt?: string },
): { ok: true; operations: readonly ApplyableBlueprintOperationV2[] } | ValidationFail {
  const schema = buildAllowedOperationsSchema(blueprint);
  if (operations.length === 0) {
    return reject("EMPTY_OPERATIONS", "operations must not be empty.");
  }
  if (operations.length > MAX_PLANNER_OPERATIONS) {
    return reject("TOO_MANY_OPERATIONS", `At most ${MAX_PLANNER_OPERATIONS} operations allowed.`);
  }

  for (const raw of operations) {
    if (isRecord(raw) && raw.op === "addComponent" && "component" in raw) {
      return reject(
        "INVALID_ADD_TYPE",
        'addComponent cannot include a full "component" object; use componentType + targetSurface + options',
      );
    }
  }

  const validated: BlueprintOperationV2[] = [];
  const normalized = normalizePlannerOperations(operations);
  let working = blueprint;

  for (const raw of normalized) {
    const result = validateOperation(raw, working, schema);
    if (!result.ok) return result;
    validated.push(result.operation);

    if (isAddComponentIntent(result.operation)) {
      const mat = materializePlannerOperations(working, [result.operation], {
        userPrompt: options?.userPrompt,
      });
      if (!mat.ok) return mat;
      const added = mat.operations[0];
      if (added?.op === "addComponent" && "component" in added) {
        working = {
          ...working,
          components: [...working.components, added.component],
        };
      }
    } else if (result.operation.op === "removeComponent") {
      const removeId = result.operation.id;
      working = {
        ...working,
        components: working.components.filter((c) => c.id !== removeId),
      };
    }
  }

  const materialized = materializePlannerOperations(blueprint, validated, {
    userPrompt: options?.userPrompt,
  });
  if (!materialized.ok) {
    return { ok: false, rejection: materialized.rejection };
  }
  return { ok: true, operations: materialized.operations };
}

export function validatePlannerJsonAndOperations(
  blueprint: GenericBuildingBlueprintV2,
  json: PlannerJsonResponse,
  options?: { userPrompt?: string },
): PlannerResult {
  if (json.status === "unsupported") {
    return {
      ok: false,
      unsupportedReason: json.unsupportedReason,
      rejectionCode: "PLANNER_UNSUPPORTED",
      rejectionDetail: json.unsupportedReason,
    };
  }
  const validated = validatePlannerOperations(blueprint, json.operations, options);
  if (!validated.ok) {
    return {
      ok: false,
      unsupportedReason: validated.rejection.detail,
      rejectionCode: validated.rejection.code,
      rejectionDetail: validated.rejection.detail,
    };
  }

  if (options?.userPrompt) {
    const overbroad = validateOverbroadPlannerPlan(options.userPrompt, json.operations);
    if (!overbroad.ok) {
      return {
        ok: false,
        unsupportedReason: overbroad.rejection.detail,
        rejectionCode: overbroad.rejection.code,
        rejectionDetail: overbroad.rejection.detail,
      };
    }
  }

  return {
    ok: true,
    operations: validated.operations,
    rationaleSummary: json.rationaleSummary,
  };
}
