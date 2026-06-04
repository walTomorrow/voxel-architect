import type {
  ComponentId,
  GenericBuildingBlueprintV2,
  PorchWidthModeV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  findChimney,
  findFrontDoor,
  findPorch,
  findRootRoom,
} from "@/src/lib/builder/blueprintComponentIndex";
import { PLANNER_PORCH_DEPTH } from "@/src/lib/builder/buildAllowedOperationsSchema";
import { getMaxWindowSlotsForSurface } from "@/src/lib/blueprints/windowFacadeCapacity";
import { applyBlueprintOperationsV2 } from "@/src/lib/builder/applyBlueprintOperationsV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";

export type WindowSurfaceAffordance = {
  readonly surface: RoomSurfaceRef;
  readonly face: RoomFace;
  readonly hasGroup: boolean;
  readonly groupId?: ComponentId;
  readonly currentCount: number;
  readonly maxSlots: number;
  readonly atCapacity: boolean;
  readonly canAddGroup: boolean;
  readonly canIncreaseCount: boolean;
  readonly maxCountIfIncrease: number;
};

export type PorchAffordance = {
  readonly present: boolean;
  readonly id?: ComponentId;
  readonly widthMode?: PorchWidthModeV2;
  readonly depth?: number;
  readonly canWiden: boolean;
  readonly canDeepen: boolean;
};

export type ChimneyAffordance = {
  readonly present: boolean;
  readonly id?: ComponentId;
  readonly canAdd: boolean;
  readonly canRemove: boolean;
};

export type BlueprintAffordancesForPlanner = {
  readonly hasPorch: boolean;
  readonly hasChimney: boolean;
  readonly surfacesWithWindows: readonly RoomSurfaceRef[];
  readonly canAdd: {
    readonly porch: boolean;
    readonly chimney: boolean;
    readonly window_group: Readonly<Record<RoomFace, boolean>>;
  };
  readonly removableIds: {
    readonly porch?: ComponentId;
    readonly chimney?: ComponentId;
    readonly windowGroups: readonly ComponentId[];
  };
  readonly missing: readonly string[];
  readonly porch: PorchAffordance;
  readonly chimney: ChimneyAffordance;
  readonly windows: readonly WindowSurfaceAffordance[];
  readonly frontWindowsAtCapacity: boolean;
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
  const updated = applied.blueprint.components.find((c) => c.id === groupId);
  if (updated?.type !== "window_group" || updated.count <= currentCount) {
    return false;
  }
  const validation = validateBlueprint(applied.blueprint);
  return isBlueprintValidationResultV2(validation) && validation.ok;
}

function buildWindowAffordance(
  blueprint: GenericBuildingBlueprintV2,
  roomId: string,
  face: RoomFace,
  windowGroupBySurface: Map<RoomSurfaceRef, ComponentId>,
): WindowSurfaceAffordance {
  const surface = surfaceForRoomFace(roomId, face);
  const maxSlots = getMaxWindowSlotsForSurface(blueprint, surface);
  const groupId = windowGroupBySurface.get(surface);
  const wg = blueprint.components.find(
    (c) => c.type === "window_group" && c.id === groupId,
  );
  const currentCount = wg?.type === "window_group" ? wg.count : 0;
  const hasGroup = groupId != null;
  const canAddGroup = !hasGroup && maxSlots > 0;
  const canIncreaseCount =
    hasGroup && groupId != null
      ? windowCountIncreaseValidates(blueprint, groupId, currentCount)
      : false;
  const atCapacity = hasGroup && !canIncreaseCount;

  return {
    surface,
    face,
    hasGroup,
    groupId,
    currentCount,
    maxSlots,
    atCapacity,
    canAddGroup,
    canIncreaseCount,
    maxCountIfIncrease: maxSlots,
  };
}

export function getBlueprintAffordancesForPlanner(
  blueprint: GenericBuildingBlueprintV2,
): BlueprintAffordancesForPlanner {
  const room = findRootRoom(blueprint);
  const roomId = room?.id ?? "main-room";
  const porch = findPorch(blueprint);
  const chimney = findChimney(blueprint);

  const surfacesWithWindows: RoomSurfaceRef[] = [];
  const windowGroups: ComponentId[] = [];
  const windowGroupBySurface = new Map<RoomSurfaceRef, ComponentId>();

  for (const c of blueprint.components) {
    if (c.type !== "window_group") continue;
    windowGroups.push(c.id);
    const surface = c.attach.targetSurface;
    surfacesWithWindows.push(surface);
    windowGroupBySurface.set(surface, c.id);
  }

  const windows: WindowSurfaceAffordance[] = ROOM_FACES.map((face) =>
    buildWindowAffordance(blueprint, roomId, face, windowGroupBySurface),
  );

  const windowGroupCanAdd: Record<RoomFace, boolean> = {
    front: false,
    back: false,
    left: false,
    right: false,
    roof: false,
  };

  for (const w of windows) {
    windowGroupCanAdd[w.face] = w.canAddGroup;
  }

  const frontSurface = surfaceForRoomFace(roomId, "front");
  const frontAff = windows.find((w) => w.surface === frontSurface);
  const frontWindowsAtCapacity = frontAff?.atCapacity ?? false;

  const missing: string[] = [];
  if (!porch) missing.push("no porch");
  if (!chimney) missing.push("no chimney");
  if (surfacesWithWindows.length === 0) missing.push("no window groups");

  const frontDoor = findFrontDoor(blueprint);
  const porchDepth = porch?.depth ?? 0;

  return {
    hasPorch: porch != null,
    hasChimney: chimney != null,
    surfacesWithWindows,
    canAdd: {
      porch: porch == null && frontDoor != null,
      chimney: chimney == null,
      window_group: windowGroupCanAdd,
    },
    removableIds: {
      ...(porch ? { porch: porch.id } : {}),
      ...(chimney ? { chimney: chimney.id } : {}),
      windowGroups,
    },
    missing,
    porch: {
      present: porch != null,
      id: porch?.id,
      widthMode: porch?.widthMode,
      depth: porch?.depth,
      canWiden: porch != null && porch.widthMode === "door_only",
      canDeepen: porch != null && porchDepth < PLANNER_PORCH_DEPTH.max,
    },
    chimney: {
      present: chimney != null,
      id: chimney?.id,
      canAdd: chimney == null,
      canRemove: chimney != null,
    },
    windows,
    frontWindowsAtCapacity,
  };
}

export function renderAffordancesText(affordances: BlueprintAffordancesForPlanner): string {
  const lines: string[] = ["Blueprint affordances:"];
  lines.push(`- hasPorch: ${affordances.hasPorch}`);
  lines.push(`- hasChimney: ${affordances.hasChimney}`);
  lines.push(`- frontWindowsAtCapacity: ${affordances.frontWindowsAtCapacity}`);
  lines.push(
    `- surfacesWithWindows: ${affordances.surfacesWithWindows.length > 0 ? affordances.surfacesWithWindows.join(", ") : "(none)"}`,
  );
  lines.push(`- canAdd.porch: ${affordances.canAdd.porch}`);
  lines.push(`- canAdd.chimney: ${affordances.canAdd.chimney}`);
  const wg = affordances.canAdd.window_group;
  lines.push(
    `- canAdd.window_group: front=${wg.front}, back=${wg.back}, left=${wg.left}, right=${wg.right}`,
  );

  for (const w of affordances.windows) {
    const parts = [
      `${w.face}: count=${w.currentCount}`,
      `max=${w.maxSlots}`,
      `atCapacity=${w.atCapacity}`,
      `canAddGroup=${w.canAddGroup}`,
      `canIncreaseCount=${w.canIncreaseCount}`,
    ];
    if (w.groupId) parts.push(`id=${w.groupId}`);
    lines.push(`- window surface ${parts.join(", ")}`);
  }

  if (affordances.porch.present) {
    lines.push(
      `- porch: id=${affordances.porch.id}, widthMode=${affordances.porch.widthMode}, depth=${affordances.porch.depth}, canWiden=${affordances.porch.canWiden}, canDeepen=${affordances.porch.canDeepen}`,
    );
  } else {
    lines.push("- porch: absent (can add if canAdd.porch)");
  }

  if (affordances.chimney.present) {
    lines.push(
      `- chimney: id=${affordances.chimney.id}, canRemove=${affordances.chimney.canRemove}`,
    );
  } else {
    lines.push("- chimney: absent (can add if canAdd.chimney)");
  }

  if (affordances.removableIds.porch) {
    lines.push(`- removable porch id: ${affordances.removableIds.porch}`);
  }
  if (affordances.removableIds.chimney) {
    lines.push(`- removable chimney id: ${affordances.removableIds.chimney}`);
  }
  if (affordances.removableIds.windowGroups.length > 0) {
    lines.push(
      `- removable window_group ids: ${affordances.removableIds.windowGroups.join(", ")}`,
    );
  }
  if (affordances.missing.length > 0) {
    lines.push(`- missing features: ${affordances.missing.join(", ")}`);
  }

  lines.push(
    "- planner: prefer operations marked available above; do not increase a window group when atCapacity=true; for welcoming/style edits pick legal alternatives (side windows, porch, materials).",
  );

  return lines.join("\n");
}
