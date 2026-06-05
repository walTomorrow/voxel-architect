import type {
  GenericBuildingBlueprint,
  GenericBuildingBlueprintV2,
  LandmarkTowerBlueprint,
  StructureBlueprint,
} from "./types";
import { isLandmarkTowerBlueprint } from "./types/landmarkTower";
import type {
  BlueprintValidationResultV2,
  LandmarkBlueprintValidationResult,
} from "./types/validationResult";
import {
  validateGenericBuildingBlueprint,
  type BlueprintValidationResult,
} from "./validateGenericBuilding";
import { validateGenericBuildingBlueprintV2 } from "./validateGenericBuildingV2";
import { validateLandmarkTowerBlueprint } from "./validateLandmarkTower";

export type { BlueprintValidationResult } from "./validateGenericBuilding";
export { validateGenericBuildingBlueprint } from "./validateGenericBuilding";
export { validateGenericBuildingBlueprintV2 } from "./validateGenericBuildingV2";
export { validateLandmarkTowerBlueprint } from "./validateLandmarkTower";
export type {
  BlueprintValidationResultV2,
  ValidationIssue,
  ValidationSeverity,
} from "./types/validationResult";

export type ValidateBlueprintResult =
  | BlueprintValidationResult
  | BlueprintValidationResultV2
  | LandmarkBlueprintValidationResult;

export function isLandmarkBlueprintValidationResult(
  result: ValidateBlueprintResult,
): result is LandmarkBlueprintValidationResult {
  if ("resolved" in result || !("warnings" in result)) return false;
  const normalized = result.normalized;
  return normalized !== undefined && isLandmarkTowerBlueprint(normalized);
}

export function isBlueprintValidationResultV2(
  result: ValidateBlueprintResult,
): result is BlueprintValidationResultV2 {
  if ("resolved" in result || !("warnings" in result)) return false;
  return !isLandmarkBlueprintValidationResult(result);
}

export function validateBlueprint(
  blueprint: GenericBuildingBlueprint,
): BlueprintValidationResult;
export function validateBlueprint(
  blueprint: GenericBuildingBlueprintV2,
): BlueprintValidationResultV2;
export function validateBlueprint(
  blueprint: LandmarkTowerBlueprint,
): LandmarkBlueprintValidationResult;
export function validateBlueprint(
  blueprint: StructureBlueprint,
): ValidateBlueprintResult;
export function validateBlueprint(
  blueprint: StructureBlueprint,
): ValidateBlueprintResult {
  if (isLandmarkTowerBlueprint(blueprint)) {
    return validateLandmarkTowerBlueprint(blueprint);
  }

  if (blueprint.structureType !== "generic_building") {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          code: "unsupported_structure_type",
          message: `Unsupported structureType: ${(blueprint as { structureType?: string }).structureType ?? "?"}.`,
          path: "/structureType",
        },
      ],
      warnings: [],
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
      {
        severity: "error",
        code: "unsupported_schema_version",
        message: `Unsupported schemaVersion: ${String(version)}.`,
        path: "/schemaVersion",
      },
    ],
    warnings: [],
    notes: [],
  };
}
