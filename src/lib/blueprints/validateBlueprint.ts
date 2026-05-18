import type {
  GenericBuildingBlueprint,
  GenericBuildingBlueprintV2,
  StructureBlueprint,
} from "./types";
import type { BlueprintValidationResultV2 } from "./types/validationResult";
import {
  validateGenericBuildingBlueprint,
  type BlueprintValidationResult,
} from "./validateGenericBuilding";
import { validateGenericBuildingBlueprintV2 } from "./validateGenericBuildingV2";

export type { BlueprintValidationResult } from "./validateGenericBuilding";
export { validateGenericBuildingBlueprint } from "./validateGenericBuilding";
export { validateGenericBuildingBlueprintV2 } from "./validateGenericBuildingV2";
export type {
  BlueprintValidationResultV2,
  ValidationIssue,
  ValidationSeverity,
} from "./types/validationResult";

export type ValidateBlueprintResult =
  | BlueprintValidationResult
  | BlueprintValidationResultV2;

export function isBlueprintValidationResultV2(
  result: ValidateBlueprintResult,
): result is BlueprintValidationResultV2 {
  return "warnings" in result;
}

export function validateBlueprint(
  blueprint: GenericBuildingBlueprint,
): BlueprintValidationResult;
export function validateBlueprint(
  blueprint: GenericBuildingBlueprintV2,
): BlueprintValidationResultV2;
export function validateBlueprint(
  blueprint: StructureBlueprint,
): ValidateBlueprintResult;
/**
 * Validates a generic building blueprint (v1 or v2).
 * v1 returns resolved structure when valid; v2 returns normalized blueprint (no resolved yet).
 */
export function validateBlueprint(
  blueprint: StructureBlueprint,
): ValidateBlueprintResult {
  if (blueprint.structureType !== "generic_building") {
    return {
      ok: false,
      errors: [
        `Unsupported structureType: ${(blueprint as { structureType?: string }).structureType ?? "?"}. Only generic_building is supported.`,
      ],
      notes: [],
    };
  }

  const version = blueprint.schemaVersion;
  if (version === 2) {
    return validateGenericBuildingBlueprintV2(blueprint);
  }
  if (version === 1) {
    return validateGenericBuildingBlueprint(blueprint as GenericBuildingBlueprint);
  }

  return {
    ok: false,
    errors: [
      `Unsupported schemaVersion: ${String(version)}. Supported values are 1 and 2.`,
    ],
    notes: [],
  };
}
