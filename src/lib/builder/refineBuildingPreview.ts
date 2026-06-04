import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BuilderToolResult } from "@/src/lib/builder/builderToolTypes";
import { planAndRefineBuildingPreview } from "@/src/lib/builder/planAndRefineBuildingPreview";

export type RefineBuildingPreviewRequest = {
  readonly prompt: string;
  readonly blueprint: GenericBuildingBlueprintV2;
};

/** Deterministic-only refinement (sync tests). Chat uses planAndRefine with auto. */
export async function refineBuildingPreview(
  request: RefineBuildingPreviewRequest,
): Promise<BuilderToolResult> {
  return planAndRefineBuildingPreview({
    prompt: request.prompt,
    blueprint: request.blueprint,
    plannerMode: "deterministic",
  });
}
