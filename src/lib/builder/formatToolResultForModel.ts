import type { BuilderToolResult } from "@/src/lib/builder/builderToolTypes";
import { formatOutcomesForToolResult } from "@/src/lib/builder/semantic/operationResultSummary";

/**
 * Injected into the Workers AI context so the model can summarize tool output.
 */
export function formatToolResultForModel(toolResult: BuilderToolResult): string {
  const kind = toolResult.toolKind === "refine" ? "refine" : "generate";

  if (!toolResult.ok) {
    const lines = [
      `TOOL_KIND: ${kind}`,
      "BUILDER_TOOL_STATUS: failed",
      `ERROR: ${toolResult.error ?? "Unknown error"}`,
      "PREVIEW_UPDATED: no",
    ];
    if (toolResult.rejectionCode) {
      lines.push(`REJECTION_CODE: ${toolResult.rejectionCode}`);
    }
    if (toolResult.rejectionDetail) {
      lines.push(`REJECTION_DETAIL: ${toolResult.rejectionDetail}`);
    }
    lines.push(
      "INSTRUCTION: Tell the user the preview was not updated. Quote REJECTION_DETAIL when present. Do not claim you changed the building or imply partial success.",
    );
    return lines.join("\n");
  }

  const warnings =
    toolResult.validationIssues?.filter((i) => i.severity === "warning").length ?? 0;

  const ops =
    toolResult.appliedOperations && toolResult.appliedOperations.length > 0
      ? toolResult.appliedOperations.join("; ")
      : "none";

  const plannerPath = toolResult.plannerPath ?? "none";
  const outcomesBlock = formatOutcomesForToolResult(toolResult.operationOutcomes ?? []);

  const lines = [
    `TOOL_KIND: ${kind}`,
    "BUILDER_TOOL_STATUS: success",
    `PLANNER_PATH: ${plannerPath}`,
    toolResult.presetLabel
      ? `PRESET: ${toolResult.presetLabel}`
      : `OPERATIONS: ${ops}`,
    `BLOCK_COUNT: ${toolResult.blockCount ?? 0}`,
    `VALIDATION_WARNINGS: ${warnings}`,
    "PREVIEW_UPDATED: yes",
    `SUMMARY: ${toolResult.assistantSummary}`,
  ];

  if (outcomesBlock.length > 0) {
    lines.push(outcomesBlock);
    lines.push(
      "INSTRUCTION: Describe the refinement using OUTCOME lines. For window_group count changes, state the final total count, not how many were added.",
    );
  } else {
    lines.push(
      kind === "refine"
        ? "INSTRUCTION: Describe the specific refinement applied. Do not say you rebuilt from scratch unless the whole preset changed."
        : "INSTRUCTION: Summarize what was generated. Do not output voxel coordinates or blueprint JSON.",
    );
  }

  return lines.join("\n");
}
