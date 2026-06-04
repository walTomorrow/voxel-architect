export type PlannerRejectionCode =
  | "INVALID_OP_TYPE"
  | "UNKNOWN_COMPONENT_ID"
  | "COMPONENT_TYPE_MISMATCH"
  | "INVALID_MATERIAL"
  | "UNSUPPORTED_PATCH_FIELD"
  | "TOO_MANY_OPERATIONS"
  | "JSON_PARSE_FAILED"
  | "PLANNER_UNSUPPORTED"
  | "PLANNER_UPSTREAM"
  | "EMPTY_MODEL_OUTPUT"
  | "UNEXPECTED_RESPONSE_SHAPE"
  | "EMPTY_OPERATIONS"
  | "INVALID_PLANNER_JSON";

export type PlannerRejection = {
  readonly code: PlannerRejectionCode;
  readonly detail: string;
};

export function formatRejectionActivityLabel(rejection: PlannerRejection): string {
  if (rejection.code === "PLANNER_UNSUPPORTED") {
    return `Rejected unsupported edit: ${rejection.detail}`;
  }
  return `Rejected: ${rejection.code} — ${rejection.detail}`;
}

export function classifyPlannerValidationMessage(message: string): PlannerRejectionCode {
  const m = message.toLowerCase();
  if (m.includes("unknown component id")) return "UNKNOWN_COMPONENT_ID";
  if (m.includes("is type") && m.includes("not")) return "COMPONENT_TYPE_MISMATCH";
  if (m.includes("invalid material")) return "INVALID_MATERIAL";
  if (
    m.includes("unknown fields") ||
    m.includes("patch has unknown") ||
    m.includes("invalid palette key") ||
    m.includes("not supported for type")
  ) {
    return "UNSUPPORTED_PATCH_FIELD";
  }
  if (m.includes("unsupported operation type") || m.includes("not allowed")) {
    return "INVALID_OP_TYPE";
  }
  if (m.includes("at most") && m.includes("operations")) return "TOO_MANY_OPERATIONS";
  if (m.includes("must not be empty")) return "EMPTY_OPERATIONS";
  if (m.includes("not valid json") || m.includes("parse")) return "JSON_PARSE_FAILED";
  return "INVALID_PLANNER_JSON";
}
