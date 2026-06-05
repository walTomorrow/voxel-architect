import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import { PLANNER_EXAMPLES_BLOCK } from "@/src/lib/builder/buildPlannerPrompt";
import {
  buildPlannerContextForLlm,
  renderPlannerContextText,
} from "@/src/lib/builder/semantic/buildPlannerContextForLlm";

const REPAIRABLE_CODES: ReadonlySet<PlannerRejectionCode> = new Set([
  "JSON_PARSE_FAILED",
  "INVALID_PLANNER_JSON",
  "INVALID_ADD_TYPE",
  "UNSUPPORTED_PATCH_FIELD",
  "UNKNOWN_COMPONENT_ID",
  "COMPONENT_TYPE_MISMATCH",
  "INVALID_SURFACE",
  "ADD_NOT_ALLOWED",
  "EMPTY_OPERATIONS",
  "OVERBROAD_OPERATION_PLAN",
]);

export function isRepairablePlannerRejection(code: PlannerRejectionCode): boolean {
  return REPAIRABLE_CODES.has(code);
}

export function buildPlannerRepairSystemPrompt(): string {
  return [
    "You are repairing a blueprint operation planner JSON response.",
    "Return ONLY one valid JSON object matching the required planner schema.",
    "No markdown. No prose. No full blueprint. No full component objects on addComponent.",
    "Use componentType + targetSurface + options for addComponent.",
    "Use id + componentType + patch for updateComponent.",
    "For direct add/remove/widen requests, return exactly ONE operation unless the user asked for a broad style change.",
    "",
    PLANNER_EXAMPLES_BLOCK,
  ].join("\n");
}

export function buildPlannerRepairUserPrompt(input: {
  readonly blueprint: GenericBuildingBlueprintV2;
  readonly userRequest: string;
  readonly rejectionCode: PlannerRejectionCode;
  readonly rejectionDetail: string;
  readonly badResponseSnippet?: string;
  readonly presetId?: string;
}): string {
  const context = buildPlannerContextForLlm(input.blueprint, {
    presetId: input.presetId,
    userRequest: input.userRequest,
  });

  const lines = [
    renderPlannerContextText(context),
    "",
    `Original user edit request: ${input.userRequest.trim()}`,
    "",
    `Previous planner output was rejected.`,
    `Rejection code: ${input.rejectionCode}`,
    `Rejection detail: ${input.rejectionDetail}`,
  ];

  if (input.badResponseSnippet) {
    lines.push("", "Previous invalid response (truncated):", input.badResponseSnippet);
  }

  lines.push(
    "",
    "Return corrected JSON only. Fix missing required fields, remove unknown fields, use addComponent intent (not full component), and use the minimum operations for direct component requests.",
  );

  return lines.join("\n");
}

export function truncateForRepairSnippet(raw: string, maxLen = 1200): string {
  const trimmed = raw.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}
