import type {
  GenericBuildingBlueprintV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import { isAddComponentIntent } from "@/src/lib/builder/blueprintOperationsV2";
import { findComponentById } from "@/src/lib/builder/blueprintComponentIndex";
import type { PlannerRejection } from "@/src/lib/builder/plannerRejection";
import type { FacadeWindowIntent } from "@/src/lib/builder/windows/facadeWindowIntentTypes";
import { parseRoomFaceFromSurface } from "@/src/lib/blueprints/windowFacadeCapacity";

export type IntentScopeValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly rejection: PlannerRejection };

function reject(detail: string): IntentScopeValidationResult {
  return {
    ok: false,
    rejection: { code: "OVERBROAD_OPERATION_PLAN", detail },
  };
}

function faceFromWindowAddOp(op: BlueprintOperationV2): RoomFace | null {
  if (isAddComponentIntent(op) && op.componentType === "window_group") {
    const surface = op.targetSurface;
    if (!surface) return null;
    return parseRoomFaceFromSurface(surface);
  }
  return null;
}

function faceFromWindowRemoveOp(
  op: BlueprintOperationV2,
  blueprint: GenericBuildingBlueprintV2,
): RoomFace | null {
  if (op.op !== "removeComponent") return null;
  const c = findComponentById(blueprint, op.id);
  if (c?.type !== "window_group") return null;
  return parseRoomFaceFromSurface(c.attach.targetSurface as RoomSurfaceRef);
}

function isWindowOnlyOp(
  op: BlueprintOperationV2,
  blueprint: GenericBuildingBlueprintV2,
): boolean {
  if (op.op === "setMaterialPalette" || op.op === "setMaterialOverride") return false;
  if (isAddComponentIntent(op)) return op.componentType === "window_group";
  if (op.op === "updateComponent") return op.componentType === "window_group";
  if (op.op === "addComponent" && "component" in op) {
    return op.component.type === "window_group";
  }
  if (op.op === "removeComponent") {
    const c = findComponentById(blueprint, op.id);
    return c?.type === "window_group";
  }
  return false;
}

export function validatePlanAgainstIntentScope(
  operations: readonly BlueprintOperationV2[],
  intent: FacadeWindowIntent | null,
  blueprint: GenericBuildingBlueprintV2,
): IntentScopeValidationResult {
  if (!intent || intent.operationScope !== "window_only") {
    return { ok: true };
  }

  for (const op of operations) {
    if (!isWindowOnlyOp(op, blueprint)) {
      const kind =
        op.op === "updateComponent"
          ? op.componentType
          : isAddComponentIntent(op)
            ? op.componentType
            : op.op;
      return reject(
        `Window-only request cannot include ${kind} operation; use only window_group add/update/remove.`,
      );
    }
  }

  const excluded = new Set(intent.excludedFaces);
  const allowedAddFaces = new Set(intent.addOrUpdateFaces);
  const allowedRemoveFaces = new Set(intent.removeFaces);

  for (const op of operations) {
    if (isAddComponentIntent(op) && op.componentType === "window_group" && op.targetSurface) {
      const face = parseRoomFaceFromSurface(op.targetSurface as RoomSurfaceRef);
      if (face && excluded.has(face)) {
        return reject(`Operation targets excluded face "${face}".`);
      }
      if (
        allowedAddFaces.size > 0 &&
        face &&
        !allowedAddFaces.has(face) &&
        !intent.targetFaces.includes(face)
      ) {
        return reject(`Add/update targets "${face}" but request only mentioned ${[...allowedAddFaces].join(", ")}.`);
      }
    }

    if (op.op === "updateComponent" && op.componentType === "window_group") {
      const c = findComponentById(blueprint, op.id);
      const face =
        c?.type === "window_group"
          ? parseRoomFaceFromSurface(c.attach.targetSurface as RoomSurfaceRef)
          : null;
      if (face && excluded.has(face)) {
        return reject(`Operation targets excluded face "${face}".`);
      }
      if (
        allowedAddFaces.size > 0 &&
        face &&
        !allowedAddFaces.has(face) &&
        !intent.targetFaces.includes(face)
      ) {
        return reject(`Add/update targets "${face}" but request only mentioned ${[...allowedAddFaces].join(", ")}.`);
      }
    }

    if (op.op === "removeComponent") {
      const face = faceFromWindowRemoveOp(op, blueprint);
      if (!intent.removeAllWindows && face && allowedRemoveFaces.size > 0 && !allowedRemoveFaces.has(face)) {
        return reject(`Remove targets "${face}" but request only mentioned removing ${[...allowedRemoveFaces].join(", ")}.`);
      }
    }
  }

  return { ok: true };
}
