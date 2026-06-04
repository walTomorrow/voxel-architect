import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import type { BlueprintAffordancesForPlanner } from "@/src/lib/builder/getBlueprintAffordancesForPlanner";

/**
 * Short, user-facing hint when post-apply validateBlueprint fails.
 * Keeps preview unchanged; paired with the raw validator message in tool output.
 */
export function buildValidationFailureSuggestion(
  errors: readonly ValidationIssue[],
  _blueprint: GenericBuildingBlueprintV2,
  affordances: BlueprintAffordancesForPlanner,
): string | undefined {
  const primary = errors[0];
  if (!primary) return undefined;

  const code = primary.code ?? "";
  const message = primary.message.toLowerCase();

  if (code === "window_count_exceeds_facade" || message.includes("façade capacity")) {
    const sideWithRoom = affordances.windows.find(
      (w) => w.canAddGroup && !w.atCapacity && w.face !== "front",
    );
    if (sideWithRoom) {
      return `The front facade is already at window capacity. I can add windows to the ${sideWithRoom.face} side instead.`;
    }
    return "That surface is already at window capacity. Try fewer windows or a different side.";
  }

  if (code === "invalid_window_layout" || message.includes('layout must be "symmetric"')) {
    return "The requested window group was missing a valid layout; defaults should apply on retry.";
  }

  if (message.includes("already has a porch")) {
    const porch = affordances.porch;
    if (porch.present && porch.canWiden) {
      return "A porch already exists; I can widen it to full facade width instead.";
    }
    if (porch.present && porch.canDeepen) {
      return "A porch already exists; I can deepen it instead.";
    }
    return "A porch already exists; try widening or deepening it instead of adding another.";
  }

  if (message.includes("already has a chimney")) {
    return "A chimney already exists; I can move it to another side or remove it first.";
  }

  if (message.includes("window group already exists")) {
    const surface = affordances.windows.find((w) => w.hasGroup && w.canIncreaseCount);
    if (surface?.groupId) {
      return `A window group already exists on ${surface.face}; I can increase the count on "${surface.groupId}" instead.`;
    }
    return "A window group already exists on that surface; use updateComponent to change count.";
  }

  return undefined;
}
