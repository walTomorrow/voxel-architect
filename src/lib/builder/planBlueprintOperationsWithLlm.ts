import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { buildPlannerUserPrompt } from "@/src/lib/builder/buildPlannerPrompt";
import { callWorkersAiJsonPlanner } from "@/src/lib/builder/callWorkersAiJsonPlanner";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import type { PlannerResult } from "@/src/lib/builder/plannerTypes";
import { validatePlannerJsonAndOperations } from "@/src/lib/builder/validatePlannerOperations";

export type PlanBlueprintOperationsInput = {
  readonly userRequest: string;
  readonly blueprint: GenericBuildingBlueprintV2;
  readonly presetId?: string;
};

export type LlmPlannerFailure = {
  readonly unsupportedReason: string;
  readonly rejectionCode: PlannerRejectionCode;
  readonly rejectionDetail: string;
  readonly plannerDiagnostics?: readonly string[];
};

/**
 * Injectable for tests — bypasses Workers AI when set.
 */
export type LlmPlannerFn = (
  input: PlanBlueprintOperationsInput,
) => Promise<PlannerResult>;

let llmPlannerOverride: LlmPlannerFn | null = null;

export function setLlmPlannerForTests(fn: LlmPlannerFn | null): void {
  llmPlannerOverride = fn;
}

export async function planBlueprintOperationsWithLlm(
  input: PlanBlueprintOperationsInput,
): Promise<
  | { ok: true; result: PlannerResult & { ok: true } }
  | { ok: false; failure: LlmPlannerFailure }
> {
  if (llmPlannerOverride) {
    const result = await llmPlannerOverride(input);
    if (result.ok) return { ok: true, result };
    return {
      ok: false,
      failure: {
        unsupportedReason: result.unsupportedReason,
        rejectionCode: result.rejectionCode ?? "PLANNER_UNSUPPORTED",
        rejectionDetail: result.rejectionDetail ?? result.unsupportedReason,
      },
    };
  }

  const userPrompt = buildPlannerUserPrompt(input.blueprint, input.userRequest, {
    presetId: input.presetId,
  });
  const call = await callWorkersAiJsonPlanner(userPrompt);
  if (!call.ok) {
    const rejectionCode: PlannerRejectionCode = call.rejectionCode;
    const detail = call.error;
    return {
      ok: false,
      failure: {
        unsupportedReason: detail,
        rejectionCode,
        rejectionDetail: detail,
        plannerDiagnostics: call.diagnostics ? [call.diagnostics.summary] : undefined,
      },
    };
  }

  const validated = validatePlannerJsonAndOperations(input.blueprint, call.json);
  if (!validated.ok) {
    return {
      ok: false,
      failure: {
        unsupportedReason: validated.unsupportedReason,
        rejectionCode: validated.rejectionCode ?? "INVALID_PLANNER_JSON",
        rejectionDetail: validated.rejectionDetail ?? validated.unsupportedReason,
      },
    };
  }
  return { ok: true, result: validated };
}
