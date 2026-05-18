import {
  isBlueprintValidationResultV2,
  type ValidateBlueprintResult,
} from "./validateBlueprint";

export function formatValidationFeedback(result: ValidateBlueprintResult): {
  errors: string[];
  warnings: string[];
  notes: string[];
} {
  if (isBlueprintValidationResultV2(result)) {
    return {
      errors: result.errors.map((e) => e.message),
      warnings: result.warnings.map((w) => w.message),
      notes: result.notes.map((n) => n.message),
    };
  }
  return {
    errors: [...result.errors],
    warnings: [],
    notes: [...result.notes],
  };
}
