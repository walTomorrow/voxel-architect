import type {
  GenericBuildingBlueprintV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  ApplyableBlueprintOperationV2,
  BlueprintOperationV2,
} from "@/src/lib/builder/blueprintOperationsV2";
import { findComponentById } from "@/src/lib/builder/blueprintComponentIndex";
import { windowTreatmentLabel } from "@/src/lib/blueprints/windowTreatment";
import { parseRoomFaceFromSurface } from "@/src/lib/blueprints/windowFacadeCapacity";

export type OperationOutcomeKind =
  | "added_component"
  | "removed_component"
  | "updated_component"
  | "updated_palette"
  | "unknown";

export type OperationOutcomeSummary = {
  readonly kind: OperationOutcomeKind;
  readonly componentId?: string;
  readonly componentType?: string;
  readonly surface?: string;
  readonly field?: string;
  readonly before?: string | number;
  readonly after?: string | number;
  readonly deltaDescription: string;
  readonly userFacingShort: string;
};

function windowSurface(
  blueprint: GenericBuildingBlueprintV2,
  id: string,
): string | undefined {
  const c = findComponentById(blueprint, id);
  if (c?.type === "window_group") return c.attach.targetSurface;
  return undefined;
}

function summarizeOne(
  before: GenericBuildingBlueprintV2,
  after: GenericBuildingBlueprintV2,
  op: ApplyableBlueprintOperationV2,
): OperationOutcomeSummary {
  if (op.op === "setMaterialPalette") {
    const keys = Object.keys(op.patch).join(", ");
    return {
      kind: "updated_palette",
      field: "materials",
      deltaDescription: `Updated material palette (${keys})`,
      userFacingShort: `Updated material palette (${keys})`,
    };
  }

  if (op.op === "removeComponent") {
    const removed = findComponentById(before, op.id);
    if (removed?.type === "window_group") {
      const face = parseRoomFaceFromSurface(removed.attach.targetSurface as RoomSurfaceRef);
      return {
        kind: "removed_component",
        componentId: op.id,
        componentType: "window_group",
        surface: removed.attach.targetSurface,
        deltaDescription: `Removed ${face} window group (${op.id})`,
        userFacingShort: `Removed ${face} window group`,
      };
    }
    return {
      kind: "removed_component",
      componentId: op.id,
      deltaDescription: `Removed component ${op.id}`,
      userFacingShort: `Removed ${op.id}`,
    };
  }

  if (op.op === "addComponent") {
    const c = op.component;
    const surface =
      c.type === "window_group" || c.type === "porch" || c.type === "chimney"
        ? c.attach.targetSurface
        : undefined;
    if (c.type === "window_group") {
      const face = surface
        ? parseRoomFaceFromSurface(surface as RoomSurfaceRef)
        : undefined;
      const treatment = windowTreatmentLabel(
        c.windowTreatment ?? "glass_block",
      );
      const faceLabel = face ? `${face} ` : "";
      return {
        kind: "added_component",
        componentId: c.id,
        componentType: c.type,
        surface,
        field: "count",
        after: c.count,
        deltaDescription: `Added ${faceLabel}window group (${c.count} ${treatment} window(s) on ${surface})`,
        userFacingShort: `Added ${faceLabel}window group with ${c.count} ${treatment} window(s)`,
      };
    }
    const extra = "";
    return {
      kind: "added_component",
      componentId: c.id,
      componentType: c.type,
      surface,
      deltaDescription: `Added ${c.type} ${c.id}${extra}`,
      userFacingShort: `Added ${c.type} ${c.id}${extra}`,
    };
  }

  if (op.op === "updateComponent") {
    const prev = findComponentById(before, op.id);
    const next = findComponentById(after, op.id);
    if (op.patch.type === "window_group" && op.patch.count !== undefined) {
      const prevCount =
        prev?.type === "window_group" ? prev.count : undefined;
      const nextCount =
        next?.type === "window_group" ? next.count : op.patch.count;
      const surface = windowSurface(after, op.id);
      const face = surface
        ? parseRoomFaceFromSurface(surface as RoomSurfaceRef)
        : undefined;
      const faceLabel = face ? `${face} ` : "";
      return {
        kind: "updated_component",
        componentId: op.id,
        componentType: "window_group",
        surface,
        field: "count",
        before: prevCount,
        after: nextCount,
        deltaDescription: `window_group ${op.id} count ${prevCount ?? "?"} → ${nextCount} (total ${nextCount})`,
        userFacingShort: `Set ${faceLabel}windows to ${nextCount} total${prevCount != null ? ` (was ${prevCount})` : ""}`,
      };
    }

    if (op.patch.type === "window_group" && op.patch.windowTreatment !== undefined) {
      const surface = windowSurface(after, op.id);
      const face = surface
        ? parseRoomFaceFromSurface(surface as RoomSurfaceRef)
        : undefined;
      const faceLabel = face ? `${face} ` : "";
      const label = windowTreatmentLabel(op.patch.windowTreatment);
      return {
        kind: "updated_component",
        componentId: op.id,
        componentType: "window_group",
        surface,
        field: "windowTreatment",
        after: op.patch.windowTreatment,
        deltaDescription: `window_group ${op.id} treatment → ${op.patch.windowTreatment}`,
        userFacingShort: `Changed ${faceLabel}windows to ${label}`,
      };
    }

    if (op.patch.type === "porch" && op.patch.widthMode !== undefined) {
      return {
        kind: "updated_component",
        componentId: op.id,
        componentType: "porch",
        field: "widthMode",
        after: op.patch.widthMode,
        deltaDescription: `porch ${op.id} widthMode → ${op.patch.widthMode}`,
        userFacingShort: `Updated porch to ${op.patch.widthMode} width`,
      };
    }

    return {
      kind: "updated_component",
      componentId: op.id,
      componentType: op.componentType,
      deltaDescription: `Updated ${op.componentType} ${op.id}`,
      userFacingShort: `Updated ${op.componentType} ${op.id}`,
    };
  }

  return {
    kind: "unknown",
    deltaDescription: "Applied operation",
    userFacingShort: "Applied refinement",
  };
}

export function summarizeOperationOutcomes(
  before: GenericBuildingBlueprintV2,
  after: GenericBuildingBlueprintV2,
  operations: readonly ApplyableBlueprintOperationV2[],
): readonly OperationOutcomeSummary[] {
  return operations.map((op) => summarizeOne(before, after, op));
}

const ALL_FACES: readonly RoomFace[] = ["front", "back", "left", "right"];

function formatFaceList(faces: readonly RoomFace[]): string {
  const unique = [...new Set(faces)];
  if (unique.length === 2 && unique.includes("left") && unique.includes("right")) {
    return "left and right";
  }
  return unique.join(", ");
}

function facesWithWindowGroups(blueprint: GenericBuildingBlueprintV2): RoomFace[] {
  return ALL_FACES.filter((face) =>
    blueprint.components.some(
      (c) =>
        c.type === "window_group" &&
        parseRoomFaceFromSurface(c.attach.targetSurface as RoomSurfaceRef) === face,
    ),
  );
}

/**
 * Per-face window façade summary for window_det plans (avoids misleading global totals).
 */
export function buildWindowFacadeAssistantSummary(
  before: GenericBuildingBlueprintV2,
  after: GenericBuildingBlueprintV2,
  operations: readonly ApplyableBlueprintOperationV2[],
): string | null {
  const outcomes = summarizeOperationOutcomes(before, after, operations);
  const windowOutcomes = outcomes.filter(
    (o) =>
      o.componentType === "window_group" ||
      (o.kind === "removed_component" && o.surface != null),
  );
  if (windowOutcomes.length === 0) return null;

  const parts: string[] = [];
  const removedFaces = windowOutcomes
    .filter((o) => o.kind === "removed_component")
    .map((o) =>
      o.surface
        ? parseRoomFaceFromSurface(o.surface as RoomSurfaceRef)
        : undefined,
    )
    .filter((f): f is RoomFace => f != null);

  const beforeGroups = before.components.filter((c) => c.type === "window_group");
  const afterGroups = after.components.filter((c) => c.type === "window_group");

  if (removedFaces.length > 0 && removedFaces.length === beforeGroups.length && afterGroups.length === 0) {
    parts.push("Removed all window groups.");
  } else if (removedFaces.length > 0) {
    parts.push(`Removed the ${formatFaceList(removedFaces)} window group(s).`);
    const unchanged = facesWithWindowGroups(after).filter((f) => !removedFaces.includes(f));
    if (unchanged.length > 0) {
      parts.push(`${formatFaceList(unchanged)} windows were left unchanged.`);
    }
  }

  for (const o of windowOutcomes.filter((x) => x.kind === "added_component")) {
    parts.push(o.userFacingShort);
  }
  for (const o of windowOutcomes.filter((x) => x.kind === "updated_component")) {
    parts.push(o.userFacingShort);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

export function buildAssistantSummaryFromOutcomes(
  outcomes: readonly OperationOutcomeSummary[],
  blockCount: number,
  warningCount: number,
  options?: {
    before?: GenericBuildingBlueprintV2;
    after?: GenericBuildingBlueprintV2;
    operations?: readonly ApplyableBlueprintOperationV2[];
    plannerPath?: string;
  },
): string {
  if (
    options?.plannerPath === "window_det" &&
    options.before &&
    options.after &&
    options.operations
  ) {
    const facadeSummary = buildWindowFacadeAssistantSummary(
      options.before,
      options.after,
      options.operations,
    );
    if (facadeSummary) {
      const warn =
        warningCount > 0 ? ` (${warningCount} validation warning(s))` : "";
      return `${facadeSummary} (${blockCount.toLocaleString()} blocks)${warn}.`;
    }
  }

  const short = outcomes.map((o) => o.userFacingShort).join("; ");
  const warn =
    warningCount > 0 ? ` (${warningCount} validation warning(s))` : "";
  return `${short} (${blockCount.toLocaleString()} blocks)${warn}.`;
}

export function formatOutcomesForToolResult(
  outcomes: readonly OperationOutcomeSummary[],
): string {
  if (outcomes.length === 0) return "";
  return outcomes.map((o) => `OUTCOME: ${o.deltaDescription}`).join("\n");
}

/** Intent ops before materialize — used only when after blueprint unavailable. */
export function summarizePlannedOperations(
  operations: readonly BlueprintOperationV2[],
): readonly OperationOutcomeSummary[] {
  return operations.map((op) => {
    if (op.op === "addComponent" && "componentType" in op) {
      const surface = op.targetSurface ?? "(default surface)";
      return {
        kind: "added_component",
        componentType: op.componentType,
        surface,
        deltaDescription: `Plan: add ${op.componentType} on ${surface}`,
        userFacingShort: `Add ${op.componentType} on ${surface}`,
      };
    }
    if (op.op === "removeComponent") {
      return {
        kind: "removed_component",
        componentId: op.id,
        deltaDescription: `Plan: remove ${op.id}`,
        userFacingShort: `Remove ${op.id}`,
      };
    }
    return {
      kind: "unknown",
      deltaDescription: `Plan: ${op.op}`,
      userFacingShort: `Apply ${op.op}`,
    };
  });
}
