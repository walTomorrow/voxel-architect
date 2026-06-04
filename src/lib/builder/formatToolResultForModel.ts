import type { GenerateBuildingPreviewResult } from "@/src/lib/builder/builderToolTypes";

/**
 * Injected into the Workers AI context so the model can summarize tool output.
 * The model must not invent blueprint JSON or claim preview success when ok is false.
 */
export function formatToolResultForModel(
  toolResult: GenerateBuildingPreviewResult,
): string {
  if (!toolResult.ok) {
    return [
      "BUILDER_TOOL_STATUS: failed",
      `ERROR: ${toolResult.error ?? "Unknown error"}`,
      "PREVIEW_UPDATED: no",
      "INSTRUCTION: Tell the user the preview was not updated. Do not claim you changed the building.",
    ].join("\n");
  }

  const warnings =
    toolResult.validationIssues?.filter((i) => i.severity === "warning").length ?? 0;

  return [
    "BUILDER_TOOL_STATUS: success",
    `PRESET: ${toolResult.presetLabel ?? toolResult.presetId ?? "unknown"}`,
    `BLOCK_COUNT: ${toolResult.blockCount ?? 0}`,
    `VALIDATION_WARNINGS: ${warnings}`,
    "PREVIEW_UPDATED: yes",
    `SUMMARY: ${toolResult.assistantSummary}`,
    "INSTRUCTION: Summarize what was generated in friendly language. Do not output voxel coordinates or blueprint JSON. Do not mention ComponentPlan.",
  ].join("\n");
}
