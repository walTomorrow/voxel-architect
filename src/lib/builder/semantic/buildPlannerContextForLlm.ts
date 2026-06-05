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
  renderAestheticRestraintForStylePrompt,
  renderStyleIntentGuidanceForPlanner,
} from "@/src/lib/builder/semantic/styleIntentGuidance";

export type PlannerContextBlocks = {
  readonly semanticSummary: string;
  readonly affordances: string;
  readonly aestheticRestraint: string;
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

  const filterCtx = { summary: semantic, rich };

  return {
    semanticSummary: renderSemanticBuildSummaryText(semantic),
    affordances: renderRichAffordancesText(rich),
    aestheticRestraint: renderAestheticRestraintForStylePrompt(styleIntents),
    styleGuidance: renderStyleIntentGuidanceForPlanner(styleIntents, filterCtx),
    allowedOperations: renderAllowedOperationsSchemaText(schema),
  };
}

export function renderPlannerContextText(blocks: PlannerContextBlocks): string {
  const parts = [blocks.semanticSummary, blocks.affordances, blocks.allowedOperations];
  if (blocks.aestheticRestraint.length > 0) {
    parts.push(blocks.aestheticRestraint);
  }
  if (blocks.styleGuidance.length > 0) {
    parts.push(blocks.styleGuidance);
  }
  return parts.join("\n\n");
}
