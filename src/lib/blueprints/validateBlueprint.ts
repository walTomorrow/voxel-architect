import type { GenericBuildingBlueprint, StructureBlueprint } from "./types";
import { validateGenericBuildingBlueprint } from "./validateGenericBuilding";

export type { BlueprintValidationResult } from "./validateGenericBuilding";
export { validateGenericBuildingBlueprint } from "./validateGenericBuilding";
export type {
  BlueprintValidationResultV2,
  ValidationIssue,
  ValidationSeverity,
} from "./types/validationResult";

/**
 * Validates a generic building blueprint and returns a resolved structure when valid.
 */
const SCHEMA_V2_NOT_IMPLEMENTED =
  "Generic building blueprint schemaVersion 2 is not implemented yet (validation is Phase 2).";

export function validateBlueprint(
  blueprint: StructureBlueprint,
): ReturnType<typeof validateGenericBuildingBlueprint> {
  if (blueprint.structureType !== "generic_building") {
    return {
      ok: false,
      errors: [
        `Unsupported structureType: ${(blueprint as { structureType?: string }).structureType ?? "?"}. Only generic_building is supported.`,
      ],
      notes: [],
    };
  }
  if (blueprint.schemaVersion === 2) {
    return {
      ok: false,
      errors: [SCHEMA_V2_NOT_IMPLEMENTED],
      notes: [],
    };
  }
  return validateGenericBuildingBlueprint(blueprint as GenericBuildingBlueprint);
}
