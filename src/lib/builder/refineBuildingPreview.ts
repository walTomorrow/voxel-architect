import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import type { BlueprintValidationResultV2 } from "@/src/lib/blueprints/types/validationResult";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import type {
  BuilderActivityEvent,
  BuilderValidationIssueView,
  BuilderToolResult,
} from "@/src/lib/builder/builderToolTypes";
import { mapRefinementPromptToOperations } from "@/src/lib/builder/mapRefinementPromptToOperations";

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
): BuilderToolResult {
  return {
    ok: false,
    toolKind: "refine",
    assistantSummary,
    schemaVersion: 2,
    error,
    activityEvents: events,
  };
}

export type RefineBuildingPreviewRequest = {
  readonly prompt: string;
  readonly blueprint: GenericBuildingBlueprintV2;
};

export function refineBuildingPreview(
  request: RefineBuildingPreviewRequest,
): BuilderToolResult {
  const baseEvents: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed refinement request", status: "success" },
    { id: "blueprint", label: "Using current v2 blueprint", status: "success" },
  ];

  const mapped = mapRefinementPromptToOperations(request.prompt, request.blueprint);
  if (!mapped.ok) {
    return failResult(
      mapped.reason,
      `${mapped.reason} The preview was not updated.`,
      [
        ...baseEvents,
        {
          id: "unsupported",
          label: "Could not map to a supported operation",
          status: "error",
        },
      ],
    );
  }

  baseEvents.push({
    id: "plan",
    label: `Planned: ${mapped.planLabel}`,
    status: "success",
  });

  const applied = applyBlueprintOperationsV2(request.blueprint, mapped.operations);
  if (!applied.ok) {
    return failResult(
      applied.error,
      `Could not apply the change: ${applied.error} The preview was not updated.`,
      [
        ...baseEvents,
        { id: "apply", label: "Apply operations", status: "error" },
      ],
    );
  }

  baseEvents.push({
    id: "apply",
    label: `Applied: ${applied.appliedLabels.join("; ")}`,
    status: "success",
  });

  const blueprint = applied.blueprint!;
  const validation = validateBlueprint(blueprint);
  if (!isBlueprintValidationResultV2(validation)) {
    return failResult(
      "Unexpected validation result.",
      "Blueprint validation failed unexpectedly. The preview was not updated.",
      [{ ...baseEvents[0]!, id: "validate", label: "Validate blueprint", status: "error" }],
    );
  }

  const validationIssues = mapValidationIssues(validation);
  if (!validation.ok) {
    const err = validation.errors[0]?.message ?? "Blueprint validation failed.";
    return failResult(
      err,
      `Validation failed after the edit: ${err} The preview was not updated.`,
      [
        ...baseEvents,
        { id: "validate", label: "Validate updated blueprint", status: "error" },
      ],
    );
  }

  const normalized = validation.normalized ?? blueprint;
  baseEvents.push({
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
      [
        ...baseEvents,
        { id: "generate", label: "Regenerate voxel structure", status: "error" },
      ],
    );
  }

  const blockCount = blocks.length;
  if (blockCount === 0) {
    return failResult(
      "Empty structure.",
      "Regeneration produced no blocks. The preview was not updated.",
      [
        ...baseEvents,
        { id: "generate", label: "Regenerate voxel structure", status: "error" },
      ],
    );
  }

  baseEvents.push({
    id: "generate",
    label: `Regenerated voxel structure (${blockCount.toLocaleString()} blocks)`,
    status: "success",
  });
  baseEvents.push({
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
    assistantSummary: `${mapped.planLabel} (${blockCount.toLocaleString()} blocks)${warningNote}.`,
    blueprint: normalized,
    appliedOperations: [...applied.appliedLabels],
    schemaVersion: 2,
    blocks,
    blockCount,
    validationIssues: validationIssues.length > 0 ? validationIssues : undefined,
    activityEvents: baseEvents,
  };
}
