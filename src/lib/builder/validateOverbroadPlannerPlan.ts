import type { BlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import {
  detectDirectComponentRequest,
  isSemanticStyleTransformRequest,
  type DirectComponentIntent,
} from "@/src/lib/builder/detectDirectComponentRequest";
import type { PlannerRejection } from "@/src/lib/builder/plannerRejection";

export type OverbroadValidationFail = { readonly ok: false; readonly rejection: PlannerRejection };

function reject(detail: string): OverbroadValidationFail {
  return {
    ok: false,
    rejection: {
      code: "OVERBROAD_OPERATION_PLAN",
      detail,
    },
  };
}

function isAddIntentOp(
  op: BlueprintOperationV2,
): op is import("@/src/lib/builder/blueprintOperationsV2").AddComponentIntentOperation {
  return op.op === "addComponent" && !("component" in op);
}

function opMatchesDirectIntent(
  op: BlueprintOperationV2,
  intent: DirectComponentIntent,
): boolean {
  switch (intent.kind) {
    case "add":
      return isAddIntentOp(op) && op.componentType === intent.componentType;
    case "remove":
      return op.op === "removeComponent";
    case "widen_porch":
      return (
        op.op === "updateComponent" &&
        op.componentType === "porch" &&
        op.patch.type === "porch" &&
        (op.patch.widthMode === "full_facade" || op.patch.depth !== undefined)
      );
    case "update_windows":
      return (
        (isAddIntentOp(op) && op.componentType === "window_group") ||
        (op.op === "updateComponent" && op.componentType === "window_group")
      );
  }
}

/**
 * Reject plans with unrelated extra operations on direct add/remove/widen requests.
 */
export function validateOverbroadPlannerPlan(
  userRequest: string,
  operations: readonly BlueprintOperationV2[],
): { readonly ok: true } | OverbroadValidationFail {
  if (isSemanticStyleTransformRequest(userRequest)) {
    return { ok: true };
  }

  const intent = detectDirectComponentRequest(userRequest);
  if (!intent) {
    return { ok: true };
  }

  if (operations.length === 0) {
    return { ok: true };
  }

  if (operations.length > 1) {
    const opsSummary = operations.map((o) => o.op).join(", ");
    return reject(
      `Direct component request should use exactly one operation, but the plan has ${operations.length} (${opsSummary}). Use only the minimum operation needed.`,
    );
  }

  const op = operations[0]!;
  if (!opMatchesDirectIntent(op, intent)) {
    return reject(
      `Direct component request does not match the planned operation type "${op.op}". Use a single focused operation for this request.`,
    );
  }

  return { ok: true };
}
