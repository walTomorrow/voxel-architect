import type {
  BlueprintValidationResultV2,
  LandmarkBlueprintValidationResult,
  ValidationIssue,
} from "@/src/lib/blueprints/types/validationResult";
import type { BuilderValidationIssueView } from "@/src/lib/builder/builderToolTypes";

type ValidationIssueBundle =
  | Pick<BlueprintValidationResultV2, "errors" | "warnings" | "notes">
  | Pick<LandmarkBlueprintValidationResult, "errors" | "warnings" | "notes">;

export function mapBuilderValidationIssues(
  result: ValidationIssueBundle,
): readonly BuilderValidationIssueView[] {
  const mapOne = (
    severity: BuilderValidationIssueView["severity"],
    list: readonly ValidationIssue[],
  ): BuilderValidationIssueView[] =>
    list.map((issue) => ({
      severity,
      message: issue.message,
      code: issue.code,
      path: issue.path,
      componentId: issue.componentId,
      surface: issue.surface,
    }));

  return [
    ...mapOne("error", result.errors),
    ...mapOne("warning", result.warnings),
    ...mapOne("note", result.notes),
  ];
}
