import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { BUILDER_SYSTEM_PROMPT } from "@/src/lib/builder/builderSystemPrompt";
import {
  renderBlueprintSummaryText,
  summarizeBlueprintForPlanner,
} from "@/src/lib/builder/summarizeBlueprintForPlanner";

export function buildCurrentBuildContextBlock(
  blueprint: GenericBuildingBlueprintV2,
  options?: { presetId?: string; generatedBlockCount?: number },
): string {
  const summary = summarizeBlueprintForPlanner(blueprint, options);
  return [
    "[Current build context — read-only]",
    renderBlueprintSummaryText(summary),
    "The 3D preview reflects this build. Discuss it when the user asks for feedback.",
    "Do not claim you changed it unless a later [Server builder tool result] says PREVIEW_UPDATED: yes.",
  ].join("\n");
}

export function buildBuilderSystemPromptWithContext(
  blueprint: GenericBuildingBlueprintV2 | null | undefined,
  options?: { presetId?: string; generatedBlockCount?: number },
): string {
  if (blueprint == null) return BUILDER_SYSTEM_PROMPT;
  return `${BUILDER_SYSTEM_PROMPT}\n\n${buildCurrentBuildContextBlock(blueprint, options)}`;
}
