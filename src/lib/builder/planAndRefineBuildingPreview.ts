import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { isLandmarkTowerBlueprint } from "@/src/lib/blueprints/types/landmarkTower";
import { planAndRefineLandmarkTowerPreview } from "@/src/lib/builder/landmarkTower/planAndRefineLandmarkTowerPreview";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import type { ApplyableBlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import type {
  BuilderActivityEvent,
  BuilderPlannerPath,
  BuilderToolResult,
} from "@/src/lib/builder/builderToolTypes";
import { mapBuilderValidationIssues } from "@/src/lib/builder/mapBuilderValidationIssues";
import { classifyRefinementPrompt } from "@/src/lib/builder/classifyRefinementPrompt";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import { planBlueprintOperationsWithLlm } from "@/src/lib/builder/planBlueprintOperationsWithLlm";
import type { PlanRefineRequest, PlannerMode } from "@/src/lib/builder/plannerTypes";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import { formatRejectionActivityLabel } from "@/src/lib/builder/plannerRejection";
import { isBuilderDevMode } from "@/src/lib/builder/builderDevMode";
import { summarizeBlueprintForPlanner } from "@/src/lib/builder/summarizeBlueprintForPlanner";
import { getBlueprintAffordancesForPlanner } from "@/src/lib/builder/getBlueprintAffordancesForPlanner";
import { buildValidationFailureSuggestion } from "@/src/lib/builder/buildValidationFailureSuggestion";
import {
  buildAssistantSummaryFromOutcomes,
  summarizeOperationOutcomes,
} from "@/src/lib/builder/semantic/operationResultSummary";
import { tryResolveWindowFacadePlan } from "@/src/lib/builder/windows/resolveWindowFacadePlan";

function appendPlannerDebugEvents(
  events: BuilderActivityEvent[],
  diagnostics?: readonly string[],
): BuilderActivityEvent[] {
  if (!isBuilderDevMode() || !diagnostics?.length) return events;
  return [
    ...events,
    {
      id: "plan-debug",
      label: `Planner debug: ${diagnostics[0]}`,
      status: "error" as const,
    },
  ];
}

function failResult(
  error: string,
  assistantSummary: string,
  events: readonly BuilderActivityEvent[],
  options?: {
    plannerPath?: BuilderPlannerPath;
    rejectionCode?: PlannerRejectionCode;
    rejectionDetail?: string;
  },
): BuilderToolResult {
  return {
    ok: false,
    toolKind: "refine",
    assistantSummary,
    schemaVersion: 2,
    error,
    activityEvents: events,
    plannerPath: options?.plannerPath,
    rejectionCode: options?.rejectionCode,
    rejectionDetail: options?.rejectionDetail ?? error,
  };
}

type PlanResolveFailure = {
  readonly reason: string;
  readonly rejectionCode?: PlannerRejectionCode;
  readonly rejectionDetail?: string;
  readonly plannerPath: BuilderPlannerPath;
};

type ResolvedPlan = {
  readonly operations: readonly ApplyableBlueprintOperationV2[];
  readonly planLabel: string;
  readonly plannerPath: BuilderPlannerPath;
  readonly rationaleSummary?: string;
};

type V2PlanRefineRequest = PlanRefineRequest & {
  readonly blueprint: GenericBuildingBlueprintV2;
};

async function runLlmPlannerPath(
  request: V2PlanRefineRequest,
  events: BuilderActivityEvent[],
  options?: { skipSemanticClassEvent?: boolean; fallbackReason?: string },
): Promise<
  | { ok: true; plan: ResolvedPlan; events: BuilderActivityEvent[] }
  | { ok: false; failure: PlanResolveFailure; events: BuilderActivityEvent[] }
> {
  if (!options?.skipSemanticClassEvent) {
    events.push({
      id: "plan-class",
      label: "Semantic edit — using LLM planner",
      status: "success",
    });
  }
  events.push({
    id: "plan-llm",
    label: "Planned semantic edit with LLM",
    status: "success",
  });

  const llm = await planBlueprintOperationsWithLlm({
    userRequest: request.prompt,
    blueprint: request.blueprint,
    presetId: request.presetId,
  });

  if (!llm.ok) {
    const { failure } = llm;
    events.push({
      id: "plan-reject",
      label: formatRejectionActivityLabel({
        code: failure.rejectionCode,
        detail: failure.rejectionDetail,
      }),
      status: "error",
    });
    const reason =
      failure.unsupportedReason ||
      options?.fallbackReason ||
      "I couldn't map that request to a supported refinement yet.";
    return {
      ok: false,
      failure: {
        reason,
        rejectionCode: failure.rejectionCode,
        rejectionDetail: failure.rejectionDetail,
        plannerPath: "llm",
      },
      events: appendPlannerDebugEvents(events, failure.plannerDiagnostics),
    };
  }

  events.push({
    id: "plan-valid",
    label: "Validated operation plan",
    status: "success",
  });
  return {
    ok: true,
    plan: {
      operations: llm.result.operations,
      planLabel: llm.result.rationaleSummary,
      plannerPath: "llm",
      rationaleSummary: llm.result.rationaleSummary,
    },
    events,
  };
}

async function resolveRefinementPlan(
  request: V2PlanRefineRequest,
  baseEvents: BuilderActivityEvent[],
): Promise<
  | { ok: true; plan: ResolvedPlan; events: BuilderActivityEvent[] }
  | { ok: false; failure: PlanResolveFailure; events: BuilderActivityEvent[] }
> {
  const mode: PlannerMode = request.plannerMode ?? "auto";
  const events = [...baseEvents];

  const summary = summarizeBlueprintForPlanner(request.blueprint, {
    presetId: request.presetId,
  });
  events.push({
    id: "summary",
    label: "Built current blueprint summary",
    status: "success",
  });

  if (mode === "llm") {
    return runLlmPlannerPath(request, events, { skipSemanticClassEvent: true });
  }

  const windowAttempt = tryResolveWindowFacadePlan(request.prompt, request.blueprint, events);
  if (windowAttempt.kind === "success") {
    return {
      ok: true,
      plan: {
        operations: windowAttempt.plan.operations,
        planLabel: windowAttempt.plan.planLabel,
        plannerPath: "window_det",
      },
      events: windowAttempt.events,
    };
  }
  if (windowAttempt.kind === "reject") {
    return {
      ok: false,
      failure: {
        reason: windowAttempt.reason,
        rejectionCode: "PLANNER_UNSUPPORTED",
        rejectionDetail: windowAttempt.reason,
        plannerPath: "window_det",
      },
      events: windowAttempt.events,
    };
  }

  if (mode === "deterministic") {
    const mapped = mapRefinementPromptToOperations(request.prompt, request.blueprint);
    if (!mapped.ok) {
      events.push({
        id: "plan-reject",
        label: `Rejected: PLANNER_UNSUPPORTED — ${mapped.reason}`,
        status: "error",
      });
      return {
        ok: false,
        failure: {
          reason: mapped.reason,
          rejectionCode: "PLANNER_UNSUPPORTED",
          rejectionDetail: mapped.reason,
          plannerPath: "deterministic",
        },
        events,
      };
    }
    events.push({
      id: "plan-det",
      label: "Matched deterministic edit",
      status: "success",
    });
    events.push({
      id: "plan",
      label: `Planned: ${mapped.planLabel}`,
      status: "success",
    });
    return {
      ok: true,
      plan: {
        operations: mapped.operations,
        planLabel: mapped.planLabel,
        plannerPath: "deterministic",
      },
      events,
    };
  }

  // auto: classification-driven routing
  const promptClass = classifyRefinementPrompt(request.prompt);

  if (promptClass === "semantic" || promptClass === "structural") {
    return runLlmPlannerPath(request, events);
  }

  const windowAuto = tryResolveWindowFacadePlan(request.prompt, request.blueprint, events);
  if (windowAuto.kind === "success") {
    return {
      ok: true,
      plan: {
        operations: windowAuto.plan.operations,
        planLabel: windowAuto.plan.planLabel,
        plannerPath: "window_det",
      },
      events: windowAuto.events,
    };
  }
  if (windowAuto.kind === "reject") {
    return {
      ok: false,
      failure: {
        reason: windowAuto.reason,
        rejectionCode: "PLANNER_UNSUPPORTED",
        rejectionDetail: windowAuto.reason,
        plannerPath: "window_det",
      },
      events: windowAuto.events,
    };
  }

  const mapped = mapRefinementPromptToOperations(request.prompt, request.blueprint);
  if (mapped.ok) {
    events.push({
      id: "plan-det",
      label: "Matched deterministic edit",
      status: "success",
    });
    events.push({
      id: "plan",
      label: `Planned: ${mapped.planLabel}`,
      status: "success",
    });
    return {
      ok: true,
      plan: {
        operations: mapped.operations,
        planLabel: mapped.planLabel,
        plannerPath: "deterministic",
      },
      events,
    };
  }

  return runLlmPlannerPath(request, events, { fallbackReason: mapped.reason });
}

function applyAndGenerate(
  blueprint: GenericBuildingBlueprintV2,
  plan: ResolvedPlan,
  events: BuilderActivityEvent[],
): BuilderToolResult {
  const applied = applyBlueprintOperationsV2(blueprint, plan.operations);
  if (!applied.ok) {
    return failResult(
      applied.error,
      `Could not apply the change: ${applied.error} The preview was not updated.`,
      [...events, { id: "apply", label: "Apply operations", status: "error" }],
      { plannerPath: plan.plannerPath },
    );
  }

  events.push({
    id: "apply",
    label: `Applied: ${applied.appliedLabels.join("; ")}`,
    status: "success",
  });

  const updated = applied.blueprint!;
  const validation = validateBlueprint(updated);
  if (!isBlueprintValidationResultV2(validation)) {
    return failResult(
      "Unexpected validation result.",
      "Blueprint validation failed unexpectedly. The preview was not updated.",
      [...events, { id: "validate", label: "Validate updated blueprint", status: "error" }],
      { plannerPath: plan.plannerPath },
    );
  }

  const validationIssues = mapBuilderValidationIssues(validation);
  if (!validation.ok) {
    const err = validation.errors[0]?.message ?? "Blueprint validation failed.";
    const affordances = getBlueprintAffordancesForPlanner(blueprint);
    const hint = buildValidationFailureSuggestion(validation.errors, updated, affordances);
    const detail = hint ? `${err} ${hint}` : err;
    return failResult(
      detail,
      `Validation failed after the edit: ${detail} The preview was not updated.`,
      [
        ...events,
        {
          id: "validate",
          label: `Blueprint validation failed: ${validation.errors[0]?.code ?? "error"}`,
          status: "error",
        },
      ],
      { plannerPath: plan.plannerPath, rejectionDetail: detail },
    );
  }

  const normalized = validation.normalized ?? updated;
  events.push({
    id: "validate",
    label: "Validated updated blueprint",
    status: "success",
  });

  let blocks;
  try {
    blocks = generateStructure(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed.";
    return failResult(
      msg,
      `Regeneration failed: ${msg} The preview was not updated.`,
      [...events, { id: "generate", label: "Regenerate voxel structure", status: "error" }],
      { plannerPath: plan.plannerPath },
    );
  }

  const blockCount = blocks.length;
  if (blockCount === 0) {
    return failResult(
      "Empty structure.",
      "Regeneration produced no blocks. The preview was not updated.",
      [...events, { id: "generate", label: "Regenerate voxel structure", status: "error" }],
      { plannerPath: plan.plannerPath },
    );
  }

  events.push({
    id: "generate",
    label: `Regenerated voxel structure (${blockCount.toLocaleString()} blocks)`,
    status: "success",
  });
  events.push({
    id: "preview",
    label: "Ready to update builder preview",
    status: "success",
  });

  const warningCount = validationIssues.filter((i) => i.severity === "warning").length;
  const operationOutcomes = summarizeOperationOutcomes(
    blueprint,
    normalized,
    plan.operations,
  );

  return {
    ok: true,
    toolKind: "refine",
    assistantSummary: buildAssistantSummaryFromOutcomes(
      operationOutcomes,
      blockCount,
      warningCount,
      {
        before: blueprint,
        after: normalized,
        operations: plan.operations,
        plannerPath: plan.plannerPath,
      },
    ),
    blueprint: normalized,
    appliedOperations: [...applied.appliedLabels],
    operationOutcomes,
    schemaVersion: 2,
    blocks,
    blockCount,
    validationIssues: validationIssues.length > 0 ? validationIssues : undefined,
    activityEvents: events,
    plannerPath: plan.plannerPath,
    rationaleSummary: plan.rationaleSummary,
  };
}

export async function planAndRefineBuildingPreview(
  request: PlanRefineRequest,
): Promise<BuilderToolResult> {
  if (isLandmarkTowerBlueprint(request.blueprint)) {
    return planAndRefineLandmarkTowerPreview({
      ...request,
      blueprint: request.blueprint,
    });
  }

  const v2Blueprint: GenericBuildingBlueprintV2 = request.blueprint;

  const baseEvents: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed refinement request", status: "success" },
    { id: "blueprint", label: "Using current v2 blueprint", status: "success" },
  ];

  const resolved = await resolveRefinementPlan(
    { ...request, blueprint: v2Blueprint },
    baseEvents,
  );
  if (!resolved.ok) {
    const f = resolved.failure;
    return failResult(
      f.reason,
      `${f.reason} The preview was not updated.`,
      resolved.events,
      {
        plannerPath: f.plannerPath,
        rejectionCode: f.rejectionCode,
        rejectionDetail: f.rejectionDetail,
      },
    );
  }

  return applyAndGenerate(v2Blueprint, resolved.plan, resolved.events);
}
