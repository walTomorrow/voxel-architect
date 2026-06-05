import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  isLandmarkTowerBlueprint,
  type LandmarkTowerBlueprint,
} from "@/src/lib/blueprints/types/landmarkTower";
import type { VoxelBlock } from "@/src/lib/voxel/types";

/** Active blueprint in builder chat (generic v2 or landmark tower). */
export type BuilderBlueprint = GenericBuildingBlueprintV2 | LandmarkTowerBlueprint;

export function assertGenericBuildingBlueprintV2(
  blueprint: BuilderBlueprint | undefined,
): GenericBuildingBlueprintV2 {
  if (!blueprint || isLandmarkTowerBlueprint(blueprint)) {
    throw new Error("Expected generic_building v2 blueprint.");
  }
  return blueprint;
}

export type BuilderToolMode =
  | "select_preset"
  | "create_from_prompt"
  | "modify_current";

export type BuilderToolKind = "generate" | "refine";

export type BuilderActivityStatus = "pending" | "success" | "error";

export type BuilderActivityEvent = {
  readonly id: string;
  readonly label: string;
  readonly status: BuilderActivityStatus;
};

export type BuilderValidationIssueView = {
  readonly severity: "error" | "warning" | "note";
  readonly message: string;
  readonly code?: string;
  readonly path?: string;
  readonly componentId?: string;
  readonly surface?: string;
};

/** Stable React list key for validation issue rows (message alone is not unique). */
export function validationIssueReactKey(
  issue: BuilderValidationIssueView,
  index: number,
): string {
  return [
    issue.severity,
    issue.code ?? "issue",
    issue.path,
    issue.componentId,
    issue.surface,
    index,
  ]
    .filter((part) => part !== undefined && part !== "")
    .join("|");
}

export type GenerateBuildingPreviewRequest = {
  readonly prompt: string;
  readonly mode: BuilderToolMode;
};

export type RefineBuildingPreviewRequest = {
  readonly prompt: string;
  readonly blueprint: BuilderBlueprint;
};

import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import type { OperationOutcomeSummary } from "@/src/lib/builder/semantic/operationResultSummary";

export type BuilderPlannerPath = "deterministic" | "window_det" | "llm" | "none";

export type BuilderToolResult = {
  readonly ok: boolean;
  readonly toolKind: BuilderToolKind;
  readonly assistantSummary: string;
  readonly blueprint?: BuilderBlueprint;
  readonly presetId?: string;
  readonly presetLabel?: string;
  readonly schemaVersion: 2;
  readonly blocks?: readonly VoxelBlock[];
  readonly blockCount?: number;
  readonly validationIssues?: readonly BuilderValidationIssueView[];
  readonly activityEvents: readonly BuilderActivityEvent[];
  readonly appliedOperations?: readonly string[];
  readonly operationOutcomes?: readonly OperationOutcomeSummary[];
  readonly plannerPath?: BuilderPlannerPath;
  readonly rationaleSummary?: string;
  readonly rejectionCode?: PlannerRejectionCode;
  readonly rejectionDetail?: string;
  readonly error?: string;
};

/** @deprecated Use BuilderToolResult */
export type GenerateBuildingPreviewResult = BuilderToolResult;

export type BuilderChatToolSuccessResponse = {
  readonly message: string;
  readonly model: string;
  readonly toolResult: BuilderToolResult;
};
