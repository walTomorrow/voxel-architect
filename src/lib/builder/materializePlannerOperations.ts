import type {
  AddComponentIntentOperation,
  ApplyableBlueprintOperationV2,
  BlueprintOperationV2,
} from "@/src/lib/builder/blueprintOperationsV2";
import { isAddComponentIntent } from "@/src/lib/builder/blueprintOperationsV2";
import { materializeAddComponent } from "@/src/lib/builder/componentOperationRegistry";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { PlannerRejection } from "@/src/lib/builder/plannerRejection";

export type MaterializeOpsResult =
  | { readonly ok: true; readonly operations: readonly ApplyableBlueprintOperationV2[] }
  | { readonly ok: false; readonly rejection: PlannerRejection };

/**
 * Replace addComponent intents with materialized components for apply.
 * Simulates prior adds in the batch so duplicate checks see pending state.
 */
export function materializePlannerOperations(
  blueprint: GenericBuildingBlueprintV2,
  operations: readonly BlueprintOperationV2[],
  options?: { userPrompt?: string },
): MaterializeOpsResult {
  let working = blueprint;
  const out: ApplyableBlueprintOperationV2[] = [];

  for (const op of operations) {
    if (isAddComponentIntent(op)) {
      const result = materializeAddComponent(working, op as AddComponentIntentOperation, {
        userPrompt: options?.userPrompt,
      });
      if (!result.ok) {
        return {
          ok: false,
          rejection: {
            code: result.code ?? "ADD_NOT_ALLOWED",
            detail: result.reason,
          },
        };
      }
      const materialized = {
        op: "addComponent" as const,
        component: result.component,
      };
      out.push(materialized);
      working = {
        ...working,
        components: [...working.components, result.component],
      };
      continue;
    }

    if (op.op === "addComponent" && "component" in op) {
      out.push(op);
      working = {
        ...working,
        components: [...working.components, op.component],
      };
      continue;
    }

    out.push(op as ApplyableBlueprintOperationV2);
  }

  return { ok: true, operations: out };
}
