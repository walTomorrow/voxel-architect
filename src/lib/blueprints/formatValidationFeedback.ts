import type {
  BlueprintValidationResultV2,
  LandmarkBlueprintValidationResult,
} from "./types/validationResult";
import type { BlueprintValidationResult } from "./validateGenericBuilding";
import type { ValidateBlueprintResult } from "./validateBlueprint";

function isLegacyValidationResult(
  result: ValidateBlueprintResult,
): result is BlueprintValidationResult {
  return "resolved" in result;
}

function isStructuredValidationResult(
  result: ValidateBlueprintResult,
): result is BlueprintValidationResultV2 | LandmarkBlueprintValidationResult {
  return "warnings" in result;
}

export function formatValidationFeedback(result: ValidateBlueprintResult): {
  errors: string[];
  warnings: string[];
  notes: string[];
} {
  if (isLegacyValidationResult(result)) {
    return {
      errors: [...result.errors],
      warnings: [],
      notes: [...result.notes],
    };
  }
  if (isStructuredValidationResult(result)) {
    return {
      errors: result.errors.map((e) => e.message),
      warnings: result.warnings.map((w) => w.message),
      notes: result.notes.map((n) => n.message),
    };
  }
  return { errors: [], warnings: [], notes: [] };
}
