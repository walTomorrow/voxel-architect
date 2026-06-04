import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import type { BlueprintValidationResultV2 } from "@/src/lib/blueprints/types/validationResult";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import type { BlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import type {
  BuilderActivityEvent,
  BuilderPlannerPath,
  BuilderValidationIssueView,
  BuilderToolResult,
} from "@/src/lib/builder/builderToolTypes";
import { classifyRefinementPrompt } from "@/src/lib/builder/classifyRefinementPrompt";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";
import { planBlueprintOperationsWithLlm } from "@/src/lib/builder/planBlueprintOperationsWithLlm";
import type { PlanRefineRequest, PlannerMode } from "@/src/lib/builder/plannerTypes";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import { formatRejectionActivityLabel } from "@/src/lib/builder/plannerRejection";
import { isBuilderDevMode } from "@/src/lib/builder/builderDevMode";
import { summarizeBlueprintForPlanner } from "@/src/lib/builder/summarizeBlueprintForPlanner";

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

function mapValidationIssues(
  result: BlueprintValidationResultV2,
): readonly BuilderValidationIssueView[] {
  const issues: BuilderValidationIssueView[] = [];
  for (const e of result.errors) {
    issues.push({ severity: "error", message: e.message, code: e.code });
  }
  for (const w of result.warnings) {
    issues.push({ severity: "warning", message: w.message, code: w.code });
  }
  for (const n of result.notes) {
    issues.push({ severity: "note", message: n.message, code: n.code });
  }
  return issues;
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
  readonly operations: readonly BlueprintOperationV2[];
  readonly planLabel: string;
  readonly plannerPath: BuilderPlannerPath;
  readonly rationaleSummary?: string;
};

async function runLlmPlannerPath(
  request: PlanRefineRequest,
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
  request: PlanRefineRequest,
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

  const validationIssues = mapValidationIssues(validation);
  if (!validation.ok) {
    const err = validation.errors[0]?.message ?? "Blueprint validation failed.";
    return failResult(
      err,
      `Validation failed after the edit: ${err} The preview was not updated.`,
      [...events, { id: "validate", label: "Validate updated blueprint", status: "error" }],
      { plannerPath: plan.plannerPath },
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

  const warningNote =
    validationIssues.filter((i) => i.severity === "warning").length > 0
      ? ` (${validationIssues.filter((i) => i.severity === "warning").length} validation warning(s))`
      : "";

  return {
    ok: true,
    toolKind: "refine",
    assistantSummary: `${plan.planLabel} (${blockCount.toLocaleString()} blocks)${warningNote}.`,
    blueprint: normalized,
    appliedOperations: [...applied.appliedLabels],
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
  const baseEvents: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed refinement request", status: "success" },
    { id: "blueprint", label: "Using current v2 blueprint", status: "success" },
  ];

  const resolved = await resolveRefinementPlan(request, baseEvents);
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

  return applyAndGenerate(request.blueprint, resolved.plan, resolved.events);
}
