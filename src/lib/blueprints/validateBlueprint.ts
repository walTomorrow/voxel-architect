import type { GenericBuildingBlueprint, StructureBlueprint } from "./types";
import { validateGenericBuildingBlueprint } from "./validateGenericBuilding";

export type { BlueprintValidationResult } from "./validateGenericBuilding";
export { validateGenericBuildingBlueprint } from "./validateGenericBuilding";

/**
 * Validates a generic building blueprint and returns a resolved structure when valid.
 */
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
  return validateGenericBuildingBlueprint(blueprint as GenericBuildingBlueprint);
}
