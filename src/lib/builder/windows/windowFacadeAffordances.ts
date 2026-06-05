import type {
  ComponentId,
  GenericBuildingBlueprintV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { WindowTreatmentV2 } from "@/src/lib/blueprints/windowTreatment";
import { findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";
import {
  getMaxWindowSlotsForSurface,
  findWindowGroupOnSurface,
} from "@/src/lib/blueprints/windowFacadeCapacity";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";

export type AffordanceAction = {
  readonly available: boolean;
  readonly reason?: string;
  readonly alternatives?: readonly string[];
};

export type WindowFaceAffordance = {
  readonly face: RoomFace;
  readonly surfaceRef: RoomSurfaceRef;
  readonly existingGroupId?: ComponentId;
  readonly currentCount: number;
  readonly maxCount: number;
  readonly minCount: number;
  readonly windowTreatment?: WindowTreatmentV2;
  readonly canAddGroup: boolean;
  readonly canIncrease: boolean;
  readonly canDecrease: boolean;
  readonly canSetTotal: (n: number) => AffordanceAction;
  readonly recommendedOperation:
    | {
        readonly op: "addComponent";
        readonly componentType: "window_group";
        readonly targetSurface: RoomSurfaceRef;
      }
    | {
        readonly op: "updateComponent";
        readonly id: string;
        readonly patchHints: { readonly count?: number; readonly windowTreatment?: WindowTreatmentV2 };
      }
    | { readonly op: "removeComponent"; readonly id: string };
  readonly reasons: readonly string[];
  readonly alternatives: readonly string[];
};

export type WindowFacadeAffordances = {
  readonly roomId: string;
  readonly faces: readonly WindowFaceAffordance[];
};

const ROOM_FACES: readonly RoomFace[] = ["front", "back", "left", "right"];

function surfaceForRoomFace(roomId: string, face: RoomFace): RoomSurfaceRef {
  return `${roomId}.${face}`;
}

function windowCountIncreaseValidates(
  blueprint: GenericBuildingBlueprintV2,
  groupId: ComponentId,
  currentCount: number,
): boolean {
  const applied = applyBlueprintOperationsV2(blueprint, [
    {
      op: "updateComponent",
      id: groupId,
      componentType: "window_group",
      patch: { type: "window_group", count: currentCount + 1 },
    },
  ]);
  if (!applied.ok || !applied.blueprint) return false;
  const validation = validateBlueprint(applied.blueprint);
  return isBlueprintValidationResultV2(validation) && validation.ok;
}

function buildFaceAffordance(
  blueprint: GenericBuildingBlueprintV2,
  roomId: string,
  face: RoomFace,
): WindowFaceAffordance {
  const surfaceRef = surfaceForRoomFace(roomId, face);
  const maxCount = getMaxWindowSlotsForSurface(blueprint, surfaceRef);
  const existing = findWindowGroupOnSurface(blueprint, surfaceRef);
  const currentCount = existing?.count ?? 0;
  const hasGroup = existing != null;
  const canAddGroup = !hasGroup && maxCount > 0;
  const canIncrease =
    hasGroup && existing != null
      ? windowCountIncreaseValidates(blueprint, existing.id, currentCount)
      : false;
  const canDecrease = hasGroup && currentCount > 0;

  const canSetTotal = (n: number): AffordanceAction => {
    if (!hasGroup) {
      return {
        available: false,
        reason: "no window_group on this face",
        alternatives: canAddGroup ? [`add window_group on ${surfaceRef}`] : [],
      };
    }
    if (n < 0 || n > maxCount) {
      return {
        available: false,
        reason: `count ${n} outside façade capacity (~${maxCount})`,
        alternatives: [`set count between 0 and ${maxCount}`],
      };
    }
    return { available: true };
  };

  const reasons: string[] = [];
  const alternatives: string[] = [];
  if (hasGroup && !canIncrease) {
    reasons.push("at façade capacity");
    if (face !== "front") alternatives.push("try another face");
  }
  if (!hasGroup && !canAddGroup) {
    reasons.push("no window capacity on this façade");
  }

  let recommendedOperation: WindowFaceAffordance["recommendedOperation"];
  if (!hasGroup && canAddGroup) {
    recommendedOperation = {
      op: "addComponent",
      componentType: "window_group",
      targetSurface: surfaceRef,
    };
  } else if (hasGroup && existing) {
    recommendedOperation = {
      op: "updateComponent",
      id: existing.id,
      patchHints: { count: currentCount },
    };
  } else {
    recommendedOperation = {
      op: "updateComponent",
      id: `${face}-windows`,
      patchHints: {},
    };
  }

  return {
    face,
    surfaceRef,
    existingGroupId: existing?.id,
    currentCount,
    maxCount,
    minCount: 0,
    windowTreatment: existing?.windowTreatment,
    canAddGroup,
    canIncrease,
    canDecrease,
    canSetTotal,
    recommendedOperation,
    reasons,
    alternatives,
  };
}

export function getWindowFacadeAffordances(
  blueprint: GenericBuildingBlueprintV2,
): WindowFacadeAffordances {
  const room = findRootRoom(blueprint);
  const roomId = room?.id ?? "main-room";
  return {
    roomId,
    faces: ROOM_FACES.map((face) => buildFaceAffordance(blueprint, roomId, face)),
  };
}

export function affordanceForFace(
  affordances: WindowFacadeAffordances,
  face: RoomFace,
): WindowFaceAffordance | undefined {
  return affordances.faces.find((f) => f.face === face);
}

/** Faces where a window edit is possible (add or increase count). */
export function facesWithWindowEditCapacity(
  affordances: WindowFacadeAffordances,
  options?: { excludeFaces?: readonly RoomFace[] },
): readonly RoomFace[] {
  const excluded = new Set(options?.excludeFaces ?? []);
  return affordances.faces
    .filter((f) => !excluded.has(f.face))
    .filter((f) => f.canAddGroup || f.canIncrease)
    .map((f) => f.face);
}
