import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ApplyableBlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import type { BuilderActivityEvent } from "@/src/lib/builder/builderToolTypes";
import { validatePlannerOperations } from "@/src/lib/builder/validatePlannerOperations";
import { buildWindowOperationsFromIntent } from "@/src/lib/builder/windows/buildWindowOperationsFromIntent";
import { parseFacadeWindowIntent } from "@/src/lib/builder/windows/parseFacadeWindowIntent";
import { validatePlanAgainstIntentScope } from "@/src/lib/builder/windows/validatePlanAgainstIntentScope";
import { getWindowFacadeAffordances } from "@/src/lib/builder/windows/windowFacadeAffordances";

export type WindowFacadeResolvedPlan = {
  readonly operations: readonly ApplyableBlueprintOperationV2[];
  readonly planLabel: string;
};

export type TryWindowFacadePlanResult =
  | { readonly kind: "success"; readonly plan: WindowFacadeResolvedPlan; readonly events: BuilderActivityEvent[] }
  | { readonly kind: "reject"; readonly reason: string; readonly events: BuilderActivityEvent[] }
  | { readonly kind: "skip" };

export function tryResolveWindowFacadePlan(
  prompt: string,
  blueprint: GenericBuildingBlueprintV2,
  baseEvents: BuilderActivityEvent[],
): TryWindowFacadePlanResult {
  const affordances = getWindowFacadeAffordances(blueprint);
  const intent = parseFacadeWindowIntent(prompt, affordances);
  if (!intent) {
    return { kind: "skip" };
  }

  if (intent.confidence === "low") {
    return { kind: "skip" };
  }

  const built = buildWindowOperationsFromIntent(intent, blueprint, affordances);
  const events = [...baseEvents];

  if (!built.ok) {
    if (intent.confidence === "high") {
      events.push({
        id: "plan-reject",
        label: `Rejected: PLANNER_UNSUPPORTED — ${built.reason}`,
        status: "error",
      });
      return { kind: "reject", reason: built.reason, events };
    }
    return { kind: "skip" };
  }

  const scope = validatePlanAgainstIntentScope(built.operations, intent, blueprint);
  if (!scope.ok) {
    events.push({
      id: "plan-reject",
      label: `Rejected: ${scope.rejection.code} — ${scope.rejection.detail}`,
      status: "error",
    });
    return { kind: "reject", reason: scope.rejection.detail, events };
  }

  const validated = validatePlannerOperations(blueprint, built.operations, {
    userPrompt: prompt,
    skipOperationCountCap: true,
  });
  if (!validated.ok) {
    events.push({
      id: "plan-reject",
      label: `Rejected: ${validated.rejection.code} — ${validated.rejection.detail}`,
      status: "error",
    });
    return { kind: "reject", reason: validated.rejection.detail, events };
  }

  events.push({
    id: "plan-window",
    label: "Matched window façade intent (deterministic)",
    status: "success",
  });
  events.push({
    id: "plan",
    label: `Planned: ${built.planLabel}`,
    status: "success",
  });

  return {
    kind: "success",
    plan: { operations: validated.operations, planLabel: built.planLabel },
    events,
  };
}
