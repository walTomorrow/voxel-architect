import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { VoxelBlock } from "@/src/lib/voxel/types";

export type BuilderToolMode =
  | "select_preset"
  | "create_from_prompt"
  | "modify_current";

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
};

export type GenerateBuildingPreviewRequest = {
  readonly prompt: string;
  readonly mode: BuilderToolMode;
};

export type GenerateBuildingPreviewResult = {
  readonly ok: boolean;
  readonly assistantSummary: string;
  readonly blueprint?: GenericBuildingBlueprintV2;
  readonly presetId?: string;
  readonly presetLabel?: string;
  readonly schemaVersion: 2;
  readonly blocks?: readonly VoxelBlock[];
  readonly blockCount?: number;
  readonly validationIssues?: readonly BuilderValidationIssueView[];
  readonly activityEvents: readonly BuilderActivityEvent[];
  readonly error?: string;
};

export type BuilderChatToolSuccessResponse = {
  readonly message: string;
  readonly model: string;
  readonly toolResult: GenerateBuildingPreviewResult;
};
