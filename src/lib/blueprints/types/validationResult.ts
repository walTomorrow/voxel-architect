import type { ComponentId, RoomSurfaceRef } from "./genericBuildingV2";
import type { GenericBuildingBlueprintV2 } from "./genericBuildingV2";
import type { LandmarkTowerBlueprint } from "./landmarkTower";

export type ValidationSeverity = "error" | "warning" | "note";

export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly componentId?: ComponentId;
  readonly surface?: RoomSurfaceRef;
  readonly anchor?: ComponentId;
  /** Future LLM / UI repair hint (Phase 2+). */
  readonly suggestion?: string;
}

/**
 * Structured validation output for schemaVersion 2 blueprints.
 * Validator implementation is Phase 2.
 */
export interface BlueprintValidationResultV2 {
  readonly ok: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly notes: readonly ValidationIssue[];
  readonly normalized?: GenericBuildingBlueprintV2;
}

export interface LandmarkBlueprintValidationResult {
  readonly ok: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly notes: readonly ValidationIssue[];
  readonly normalized?: LandmarkTowerBlueprint;
}
