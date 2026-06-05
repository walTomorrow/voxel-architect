import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  buildAllowedOperationsSchema,
  renderAllowedOperationsSchemaText,
} from "@/src/lib/builder/buildAllowedOperationsSchema";
import {
  getSemanticBuildSummaryForPlanner,
  renderSemanticBuildSummaryText,
} from "@/src/lib/builder/semantic/getSemanticBuildSummaryForPlanner";
import {
  getRichBlueprintAffordancesForPlanner,
  renderRichAffordancesText,
} from "@/src/lib/builder/semantic/richAffordances";
import {
  detectStyleIntents,
  renderStyleIntentGuidanceForPlanner,
} from "@/src/lib/builder/semantic/styleIntentGuidance";

export type PlannerContextBlocks = {
  readonly semanticSummary: string;
  readonly affordances: string;
  readonly styleGuidance: string;
  readonly allowedOperations: string;
};

export function buildPlannerContextForLlm(
  blueprint: GenericBuildingBlueprintV2,
  options?: { presetId?: string; userRequest?: string },
): PlannerContextBlocks {
  const semantic = getSemanticBuildSummaryForPlanner(blueprint, {
    presetId: options?.presetId,
  });
  const rich = getRichBlueprintAffordancesForPlanner(blueprint);
  const schema = buildAllowedOperationsSchema(blueprint);

  const styleIntents =
    options?.userRequest != null ? detectStyleIntents(options.userRequest) : [];

  return {
    semanticSummary: renderSemanticBuildSummaryText(semantic),
    affordances: renderRichAffordancesText(rich),
    styleGuidance: renderStyleIntentGuidanceForPlanner(styleIntents),
    allowedOperations: renderAllowedOperationsSchemaText(schema),
  };
}

export function renderPlannerContextText(blocks: PlannerContextBlocks): string {
  const parts = [blocks.semanticSummary, blocks.affordances, blocks.allowedOperations];
  if (blocks.styleGuidance.length > 0) {
    parts.push(blocks.styleGuidance);
  }
  return parts.join("\n\n");
}
