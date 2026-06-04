import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { buildPlannerUserPrompt } from "@/src/lib/builder/buildPlannerPrompt";
import {
  callWorkersAiJsonPlanner,
  fetchPlannerText,
  parsePlannerRawText,
} from "@/src/lib/builder/callWorkersAiJsonPlanner";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import type { PlannerJsonResponse, PlannerResult } from "@/src/lib/builder/plannerTypes";
import { validatePlannerJsonAndOperations } from "@/src/lib/builder/validatePlannerOperations";
import {
  buildPlannerRepairSystemPrompt,
  buildPlannerRepairUserPrompt,
  isRepairablePlannerRejection,
  truncateForRepairSnippet,
} from "@/src/lib/builder/plannerRepair";

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

function failureFromValidation(
  validated: Extract<PlannerResult, { ok: false }>,
): LlmPlannerFailure {
  return {
    unsupportedReason: validated.unsupportedReason,
    rejectionCode: validated.rejectionCode ?? "INVALID_PLANNER_JSON",
    rejectionDetail: validated.rejectionDetail ?? validated.unsupportedReason,
  };
}

async function runPlannerRepairAttempt(input: {
  readonly blueprint: GenericBuildingBlueprintV2;
  readonly userRequest: string;
  readonly userPrompt: string;
  readonly presetId?: string;
  readonly rejectionCode: PlannerRejectionCode;
  readonly rejectionDetail: string;
  readonly badRawText?: string;
}): Promise<
  | { ok: true; json: PlannerJsonResponse; model: string }
  | { ok: false; failure: LlmPlannerFailure }
> {
  const repairUserPrompt = buildPlannerRepairUserPrompt({
    blueprint: input.blueprint,
    userRequest: input.userRequest,
    rejectionCode: input.rejectionCode,
    rejectionDetail: input.rejectionDetail,
    badResponseSnippet: input.badRawText
      ? truncateForRepairSnippet(input.badRawText)
      : undefined,
    presetId: input.presetId,
  });

  const repairFetch = await fetchPlannerText(repairUserPrompt, buildPlannerRepairSystemPrompt());
  if (!repairFetch.ok) {
    return {
      ok: false,
      failure: {
        unsupportedReason: repairFetch.error,
        rejectionCode: repairFetch.rejectionCode,
        rejectionDetail: repairFetch.error,
      },
    };
  }

  const parsed = parsePlannerRawText(repairFetch.rawText);
  if (!parsed.ok) {
    return {
      ok: false,
      failure: {
        unsupportedReason: parsed.error,
        rejectionCode: parsed.code,
        rejectionDetail: parsed.error,
      },
    };
  }

  const validated = validatePlannerJsonAndOperations(input.blueprint, parsed.json, {
    userPrompt: input.userRequest,
  });
  if (!validated.ok) {
    return { ok: false, failure: failureFromValidation(validated) };
  }

  return { ok: true, json: parsed.json, model: repairFetch.model };
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
    return {
      ok: false,
      failure: {
        unsupportedReason: call.error,
        rejectionCode: call.rejectionCode,
        rejectionDetail: call.error,
        plannerDiagnostics: call.diagnostics ? [call.diagnostics.summary] : undefined,
      },
    };
  }

  let validated = validatePlannerJsonAndOperations(input.blueprint, call.json, {
    userPrompt: input.userRequest,
  });

  if (
    !validated.ok &&
    validated.rejectionCode &&
    isRepairablePlannerRejection(validated.rejectionCode)
  ) {
    const repaired = await runPlannerRepairAttempt({
      blueprint: input.blueprint,
      userRequest: input.userRequest,
      userPrompt,
      presetId: input.presetId,
      rejectionCode: validated.rejectionCode,
      rejectionDetail: validated.rejectionDetail ?? validated.unsupportedReason,
      badRawText: call.rawText,
    });
    if (repaired.ok) {
      validated = validatePlannerJsonAndOperations(input.blueprint, repaired.json, {
        userPrompt: input.userRequest,
      });
      if (validated.ok) {
        return { ok: true, result: validated };
      }
    } else {
      return { ok: false, failure: repaired.failure };
    }
  }

  if (!validated.ok) {
    return { ok: false, failure: failureFromValidation(validated) };
  }

  return { ok: true, result: validated };
}
