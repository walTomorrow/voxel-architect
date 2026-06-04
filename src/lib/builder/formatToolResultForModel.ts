import type { BuilderToolResult } from "@/src/lib/builder/builderToolTypes";

/**
 * Injected into the Workers AI context so the model can summarize tool output.
 */
export function formatToolResultForModel(toolResult: BuilderToolResult): string {
  const kind = toolResult.toolKind === "refine" ? "refine" : "generate";

  if (!toolResult.ok) {
    return [
      `TOOL_KIND: ${kind}`,
      "BUILDER_TOOL_STATUS: failed",
      `ERROR: ${toolResult.error ?? "Unknown error"}`,
      "PREVIEW_UPDATED: no",
      "INSTRUCTION: Tell the user the preview was not updated. Do not claim you changed the building.",
    ].join("\n");
  }

  const warnings =
    toolResult.validationIssues?.filter((i) => i.severity === "warning").length ?? 0;

  const ops =
    toolResult.appliedOperations && toolResult.appliedOperations.length > 0
      ? toolResult.appliedOperations.join("; ")
      : "none";

  return [
    `TOOL_KIND: ${kind}`,
    "BUILDER_TOOL_STATUS: success",
    toolResult.presetLabel
      ? `PRESET: ${toolResult.presetLabel}`
      : `OPERATIONS: ${ops}`,
    `BLOCK_COUNT: ${toolResult.blockCount ?? 0}`,
    `VALIDATION_WARNINGS: ${warnings}`,
    "PREVIEW_UPDATED: yes",
    `SUMMARY: ${toolResult.assistantSummary}`,
    kind === "refine"
      ? "INSTRUCTION: Describe the specific refinement applied. Do not say you rebuilt from scratch unless the whole preset changed."
      : "INSTRUCTION: Summarize what was generated. Do not output voxel coordinates or blueprint JSON.",
  ].join("\n");
}
