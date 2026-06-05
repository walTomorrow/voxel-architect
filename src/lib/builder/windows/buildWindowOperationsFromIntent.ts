import type {
  GenericBuildingBlueprintV2,
  RoomFace,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import { DEFAULT_WINDOW_TREATMENT } from "@/src/lib/blueprints/windowTreatment";
import type { FacadeWindowIntent } from "@/src/lib/builder/windows/facadeWindowIntentTypes";
import {
  affordanceForFace,
  type WindowFacadeAffordances,
} from "@/src/lib/builder/windows/windowFacadeAffordances";

export type BuildWindowOperationsResult =
  | {
      readonly ok: true;
      readonly operations: readonly BlueprintOperationV2[];
      readonly planLabel: string;
    }
  | { readonly ok: false; readonly reason: string };

function clampCount(n: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(n)));
}

function facesClearedByRemoves(
  intent: FacadeWindowIntent,
  affordances: WindowFacadeAffordances,
): ReadonlySet<RoomFace> {
  const cleared = new Set<RoomFace>();
  if (intent.removeAllWindows) {
    for (const face of affordances.faces) {
      if (face.existingGroupId) cleared.add(face.face);
    }
    return cleared;
  }
  for (const face of intent.removeFaces) {
    if (affordanceForFace(affordances, face)?.existingGroupId) {
      cleared.add(face);
    }
  }
  return cleared;
}

function inferMoveCount(
  intent: FacadeWindowIntent,
  affordances: WindowFacadeAffordances,
  targetFace: RoomFace,
): number | undefined {
  if (intent.requestedCount != null) return intent.requestedCount;
  if (intent.perFaceRequestedCounts?.[targetFace] != null) {
    return intent.perFaceRequestedCounts[targetFace];
  }
  if (intent.sourceFaces.length === 0) return undefined;

  if (intent.sourceFaces.length === 1 && intent.addOrUpdateFaces.length === 1) {
    const src = affordanceForFace(affordances, intent.sourceFaces[0]!);
    if (src && src.currentCount > 0) return src.currentCount;
  }

  if (
    intent.sourceFaces.includes("left") &&
    intent.sourceFaces.includes("right") &&
    intent.addOrUpdateFaces.length === 1
  ) {
    const left = affordanceForFace(affordances, "left");
    const right = affordanceForFace(affordances, "right");
    const total = (left?.currentCount ?? 0) + (right?.currentCount ?? 0);
    return total > 0 ? total : 1;
  }

  if (intent.sourceFaces.length === 1 && intent.addOrUpdateFaces.length > 1) {
    const src = affordanceForFace(affordances, intent.sourceFaces[0]!);
    if (src && src.currentCount > 0) return src.currentCount;
  }

  return undefined;
}

function buildForFace(
  intent: FacadeWindowIntent,
  affordances: WindowFacadeAffordances,
  face: RoomFace,
  explicitCount?: number,
  clearedFaces?: ReadonlySet<RoomFace>,
): BlueprintOperationV2 | null {
  const aff = affordanceForFace(affordances, face);
  if (!aff) return null;

  const groupCleared = clearedFaces?.has(face) ?? false;
  const existingGroupId = groupCleared ? undefined : aff.existingGroupId;
  const currentCount = groupCleared ? 0 : aff.currentCount;
  const canAddGroup = groupCleared ? aff.maxCount > 0 : aff.canAddGroup;
  const canIncrease = groupCleared ? false : aff.canIncrease;

  const treatment = intent.windowTreatment;
  const moveCount = inferMoveCount(intent, affordances, face);
  const requestedCount = explicitCount ?? moveCount ?? intent.requestedCount;

  if (intent.countMode === "total" && requestedCount != null) {
    if (!existingGroupId) {
      if (!canAddGroup) return null;
      return {
        op: "addComponent",
        componentType: "window_group",
        targetSurface: aff.surfaceRef,
        options: {
          kind: "window_group",
          count: clampCount(requestedCount, aff.maxCount),
          windowTreatment: treatment ?? DEFAULT_WINDOW_TREATMENT,
        },
      };
    }
    const patch: {
      type: "window_group";
      count: number;
      windowTreatment?: typeof treatment;
    } = {
      type: "window_group",
      count: clampCount(requestedCount, aff.maxCount),
    };
    if (treatment) patch.windowTreatment = treatment;
    return {
      op: "updateComponent",
      id: existingGroupId,
      componentType: "window_group",
      patch,
    };
  }

  if (treatment && existingGroupId) {
    return {
      op: "updateComponent",
      id: existingGroupId,
      componentType: "window_group",
      patch: { type: "window_group", windowTreatment: treatment },
    };
  }

  const delta = intent.plurality === "single" || intent.countMode === "delta" ? 1 : 1;

  if (!existingGroupId) {
    if (!canAddGroup) return null;
    const count =
      requestedCount != null
        ? clampCount(requestedCount, aff.maxCount)
        : intent.plurality === "single"
          ? 1
          : Math.min(2, aff.maxCount);
    return {
      op: "addComponent",
      componentType: "window_group",
      targetSurface: aff.surfaceRef,
      options: {
        kind: "window_group",
        count,
        windowTreatment: treatment ?? DEFAULT_WINDOW_TREATMENT,
      },
    };
  }

  if (!canIncrease && intent.countMode === "delta") {
    return null;
  }

  const nextCount = clampCount(currentCount + delta, aff.maxCount);
  if (nextCount === currentCount && intent.countMode === "delta") {
    return null;
  }

  return {
    op: "updateComponent",
    id: existingGroupId,
    componentType: "window_group",
    patch: {
      type: "window_group",
      count: nextCount,
      ...(treatment ? { windowTreatment: treatment } : {}),
    },
  };
}

function buildRemoveOperations(
  intent: FacadeWindowIntent,
  affordances: WindowFacadeAffordances,
): BlueprintOperationV2[] {
  const operations: BlueprintOperationV2[] = [];

  if (intent.removeAllWindows) {
    for (const face of affordances.faces) {
      if (face.existingGroupId) {
        operations.push({ op: "removeComponent", id: face.existingGroupId });
      }
    }
    return operations;
  }

  for (const face of intent.removeFaces) {
    const aff = affordanceForFace(affordances, face);
    if (aff?.existingGroupId) {
      operations.push({ op: "removeComponent", id: aff.existingGroupId });
    }
  }

  return operations;
}

function buildAddOrUpdateOperations(
  intent: FacadeWindowIntent,
  affordances: WindowFacadeAffordances,
  clearedFaces: ReadonlySet<RoomFace>,
): BlueprintOperationV2[] {
  const operations: BlueprintOperationV2[] = [];
  const faces =
    intent.addOrUpdateFaces.length > 0 ? intent.addOrUpdateFaces : intent.targetFaces;

  for (const face of faces) {
    if (intent.excludedFaces.includes(face)) continue;
    const perFaceCount = intent.perFaceRequestedCounts?.[face];
    const op = buildForFace(intent, affordances, face, perFaceCount, clearedFaces);
    if (op) operations.push(op);
  }

  return operations;
}

export function buildWindowOperationsFromIntent(
  intent: FacadeWindowIntent,
  _blueprint: GenericBuildingBlueprintV2,
  affordances: WindowFacadeAffordances,
): BuildWindowOperationsResult {
  if (intent.operationScope !== "window_only") {
    return { ok: false, reason: "Not a window-only intent." };
  }

  const removeOps = buildRemoveOperations(intent, affordances);
  const clearedFaces = facesClearedByRemoves(intent, affordances);
  const addOps = buildAddOrUpdateOperations(intent, affordances, clearedFaces);
  const operations = [...removeOps, ...addOps];

  if (operations.length === 0) {
    return {
      ok: false,
      reason: "No window operations could be built for the requested façades (capacity or missing groups).",
    };
  }

  const removedFaces = intent.removeAllWindows
    ? affordances.faces.filter((f) => f.existingGroupId).map((f) => f.face)
    : intent.removeFaces.filter((face) => {
        const aff = affordanceForFace(affordances, face);
        return aff?.existingGroupId != null;
      });

  const addedFaces = addOps
    .map((op) => {
      if (op.op === "addComponent" && "targetSurface" in op) {
        const m = String(op.targetSurface).match(/\.(front|back|left|right)$/);
        return m?.[1] as RoomFace | undefined;
      }
      if (op.op === "updateComponent") {
        const aff = affordances.faces.find((f) => f.existingGroupId === op.id);
        return aff?.face;
      }
      return undefined;
    })
    .filter((f): f is RoomFace => f != null);

  const parts: string[] = [];
  if (intent.removeAllWindows) {
    parts.push("Remove all window groups");
  } else if (removedFaces.length > 0) {
    parts.push(`Remove window group(s) on ${removedFaces.join(", ")}`);
  }
  if (addedFaces.length > 0) {
    parts.push(`Window edit on ${[...new Set(addedFaces)].join(", ")}`);
  }

  const planLabel = parts.length > 0 ? parts.join("; ") : "Window façade edit";

  return { ok: true, operations, planLabel };
}
