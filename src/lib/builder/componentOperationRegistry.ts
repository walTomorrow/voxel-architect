import type {
  ChimneyComponentV2,
  ComponentId,
  GenericBuildingBlueprintV2,
  GenericBuildingComponentV2,
  HorizontalPlacementV2,
  PorchComponentV2,
  PorchWidthModeV2,
  RoomFace,
  RoomSurfaceRef,
  WindowGroupComponentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  AddableComponentKind,
  AddComponentIntentOperation,
  AddComponentOptions,
} from "@/src/lib/builder/blueprintOperationsV2";
import {
  findChimney,
  findComponentById,
  findFrontDoor,
  findPorch,
  findRootRoom,
} from "@/src/lib/builder/blueprintComponentIndex";

const RESERVED_IDS = new Set([
  "main-room",
  "main-roof",
  "front-door",
  "front-windows",
  "front-step",
]);

export type CanAddResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export type MaterializeAddResult =
  | { readonly ok: true; readonly component: GenericBuildingComponentV2; readonly label: string }
  | { readonly ok: false; readonly reason: string; readonly code?: "ADD_NOT_ALLOWED" | "INVALID_SURFACE" };

const DEFAULT_PORCH_DEPTH = 2;

function parseFaceFromSurface(surface: RoomSurfaceRef): RoomFace | null {
  const parts = surface.split(".");
  const face = parts[parts.length - 1];
  if (face === "front" || face === "back" || face === "left" || face === "right" || face === "roof") {
    return face;
  }
  return null;
}

function defaultRoomId(blueprint: GenericBuildingBlueprintV2): string {
  return findRootRoom(blueprint)?.id ?? "main-room";
}

function surfaceRef(roomId: string, face: RoomFace): RoomSurfaceRef {
  return `${roomId}.${face}`;
}

function horizontalPlacement(
  placement?: HorizontalPlacementV2["horizontal"],
): HorizontalPlacementV2 | undefined {
  if (!placement) return { horizontal: "center" };
  return { horizontal: placement };
}

export function inferWindowSurfaceFromPrompt(
  prompt: string,
  blueprint: GenericBuildingBlueprintV2,
): RoomSurfaceRef | null {
  const roomId = defaultRoomId(blueprint);
  const text = prompt.toLowerCase();
  if (/\b(left side|left wall|on the left|left.?facing|left windows?)\b/.test(text)) {
    return surfaceRef(roomId, "left");
  }
  if (/\b(right side|right wall|on the right|right.?facing|right windows?)\b/.test(text)) {
    return surfaceRef(roomId, "right");
  }
  if (/\b(back side|back wall|on the back|rear|back windows?)\b/.test(text)) {
    return surfaceRef(roomId, "back");
  }
  if (/\b(front side|front wall|on the front|front windows?)\b/.test(text)) {
    return surfaceRef(roomId, "front");
  }
  return null;
}

function windowGroupOnSurface(
  blueprint: GenericBuildingBlueprintV2,
  surface: RoomSurfaceRef,
): WindowGroupComponentV2 | undefined {
  return blueprint.components.find(
    (c): c is WindowGroupComponentV2 =>
      c.type === "window_group" && c.attach.targetSurface === surface,
  );
}

export function canAddComponent(
  blueprint: GenericBuildingBlueprintV2,
  kind: AddableComponentKind,
  targetSurface?: RoomSurfaceRef,
): CanAddResult {
  switch (kind) {
    case "porch": {
      if (findPorch(blueprint)) {
        return { ok: false, reason: "Blueprint already has a porch." };
      }
      if (!findFrontDoor(blueprint)) {
        return {
          ok: false,
          reason: "Cannot add porch: no front door to align with (door_only mode).",
        };
      }
      return { ok: true };
    }
    case "chimney": {
      if (findChimney(blueprint)) {
        return { ok: false, reason: "Blueprint already has a chimney." };
      }
      return { ok: true };
    }
    case "window_group": {
      const roomId = defaultRoomId(blueprint);
      const surface =
        targetSurface ??
        surfaceRef(roomId, "front");
      const face = parseFaceFromSurface(surface);
      if (!surface.startsWith(`${roomId}.`) || face == null || face === "roof") {
        return { ok: false, reason: `Invalid target surface "${surface}" for window_group.` };
      }
      if (windowGroupOnSurface(blueprint, surface)) {
        return {
          ok: false,
          reason: `Window group already exists on ${surface}. Use updateComponent instead.`,
        };
      }
      return { ok: true };
    }
  }
}

function generateComponentId(
  blueprint: GenericBuildingBlueprintV2,
  base: string,
  preferred?: string,
): string {
  if (preferred && !findComponentById(blueprint, preferred) && !RESERVED_IDS.has(preferred)) {
    return preferred;
  }
  if (!findComponentById(blueprint, base) && !RESERVED_IDS.has(base)) {
    return base;
  }
  for (let n = 2; n < 20; n++) {
    const candidate = `${base}-${n}`;
    if (!findComponentById(blueprint, candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function resolvePorchDefaults(blueprint: GenericBuildingBlueprintV2): {
  widthMode: PorchWidthModeV2;
  aroundDoor?: ComponentId;
} {
  const door = findFrontDoor(blueprint);
  if (door) {
    return { widthMode: "door_only", aroundDoor: door.id };
  }
  return { widthMode: "full_facade" };
}

function materializePorch(
  blueprint: GenericBuildingBlueprintV2,
  intent: AddComponentIntentOperation,
): MaterializeAddResult {
  const roomId = defaultRoomId(blueprint);
  const targetSurface = intent.targetSurface ?? surfaceRef(roomId, "front");
  const porchDefaults = resolvePorchDefaults(blueprint);
  const opts = intent.options?.kind === "porch" ? intent.options : undefined;

  let widthMode = opts?.widthMode ?? porchDefaults.widthMode;
  let aroundDoor = porchDefaults.aroundDoor;

  if (widthMode === "full_facade") {
    aroundDoor = undefined;
  }

  const depth = opts?.depth ?? DEFAULT_PORCH_DEPTH;
  const id = generateComponentId(blueprint, "front-porch", intent.id);

  const component: PorchComponentV2 = {
    id,
    type: "porch",
    label: "Front porch",
    attach: {
      targetSurface,
      placement: horizontalPlacement(intent.placement),
    },
    depth,
    widthMode,
    ...(aroundDoor ? { aroundDoor } : {}),
  };

  return {
    ok: true,
    component,
    label: `Added porch on ${targetSurface}`,
  };
}

function materializeChimney(
  blueprint: GenericBuildingBlueprintV2,
  intent: AddComponentIntentOperation,
): MaterializeAddResult {
  const roomId = defaultRoomId(blueprint);
  let targetSurface = intent.targetSurface ?? surfaceRef(roomId, "back");
  const face = parseFaceFromSurface(targetSurface);
  if (face === "front") {
    targetSurface = surfaceRef(roomId, "back");
  }

  const opts = intent.options?.kind === "chimney" ? intent.options : undefined;
  const horizontal = opts?.placementHorizontal ?? intent.placement ?? "center";

  const id = generateComponentId(blueprint, "chimney", intent.id);

  const component: ChimneyComponentV2 = {
    id,
    type: "chimney",
    label: "Chimney",
    attach: {
      targetSurface,
      placement: { horizontal },
    },
  };

  return {
    ok: true,
    component,
    label: `Added chimney on ${targetSurface}`,
  };
}

import {
  inferWindowCountFromPrompt,
  sanitizeWindowGroupComponent,
  sanitizeWindowLayout,
} from "@/src/lib/blueprints/windowFacadeCapacity";

function materializeWindowGroup(
  blueprint: GenericBuildingBlueprintV2,
  intent: AddComponentIntentOperation,
  userPrompt?: string,
): MaterializeAddResult {
  const roomId = defaultRoomId(blueprint);
  const inferred = userPrompt ? inferWindowSurfaceFromPrompt(userPrompt, blueprint) : null;
  const targetSurface =
    intent.targetSurface ?? inferred ?? surfaceRef(roomId, "left");

  const can = canAddComponent(blueprint, "window_group", targetSurface);
  if (!can.ok) {
    return { ok: false, reason: can.reason, code: "ADD_NOT_ALLOWED" };
  }

  const opts = intent.options?.kind === "window_group" ? intent.options : undefined;
  const face = parseFaceFromSurface(targetSurface);
  const baseId =
    face === "left"
      ? "left-windows"
      : face === "right"
        ? "right-windows"
        : face === "back"
          ? "back-windows"
          : "front-windows";

  const id = generateComponentId(blueprint, baseId, intent.id);

  const count = inferWindowCountFromPrompt(userPrompt, opts?.count, targetSurface, blueprint);
  const layout = sanitizeWindowLayout(opts?.layout, targetSurface);

  const component = sanitizeWindowGroupComponent(
    {
      id,
      type: "window_group",
      label: `${face ?? "side"} windows`,
      attach: {
        targetSurface,
        placement: horizontalPlacement(intent.placement),
      },
      count,
      layout,
      heightBand: "mid",
    },
    blueprint,
  );

  return {
    ok: true,
    component,
    label: `Added window group on ${targetSurface}`,
  };
}

export function materializeAddComponent(
  blueprint: GenericBuildingBlueprintV2,
  intent: AddComponentIntentOperation,
  options?: { userPrompt?: string },
): MaterializeAddResult {
  const can = canAddComponent(blueprint, intent.componentType, intent.targetSurface);
  if (!can.ok) {
    return { ok: false, reason: can.reason, code: "ADD_NOT_ALLOWED" };
  }

  switch (intent.componentType) {
    case "porch":
      return materializePorch(blueprint, intent);
    case "chimney":
      return materializeChimney(blueprint, intent);
    case "window_group":
      return materializeWindowGroup(blueprint, intent, options?.userPrompt);
  }
}

export const REMOVABLE_COMPONENT_TYPES = new Set<AddableComponentKind>([
  "porch",
  "chimney",
  "window_group",
]);

export function isRemovableComponent(
  component: GenericBuildingComponentV2,
): component is GenericBuildingComponentV2 & { type: AddableComponentKind } {
  return REMOVABLE_COMPONENT_TYPES.has(component.type as AddableComponentKind);
}

export function canRemoveComponent(
  blueprint: GenericBuildingBlueprintV2,
  id: ComponentId,
): CanAddResult {
  const existing = findComponentById(blueprint, id);
  if (!existing) {
    return { ok: false, reason: `Unknown component id "${id}".` };
  }
  if (!isRemovableComponent(existing)) {
    return {
      ok: false,
      reason: `Component "${id}" (${existing.type}) cannot be removed in this phase.`,
    };
  }
  return { ok: true };
}

export function normalizeAddOptions(
  raw: unknown,
  componentType: AddableComponentKind,
  targetSurface?: RoomSurfaceRef,
): AddComponentOptions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (o.kind === componentType) {
    return o as AddComponentOptions;
  }
  switch (componentType) {
    case "porch":
      return {
        kind: "porch",
        ...(typeof o.depth === "number" ? { depth: o.depth } : {}),
        ...(o.widthMode === "door_only" || o.widthMode === "full_facade"
          ? { widthMode: o.widthMode }
          : {}),
      };
    case "chimney":
      return {
        kind: "chimney",
        ...(o.placementHorizontal === "left" ||
        o.placementHorizontal === "center" ||
        o.placementHorizontal === "right"
          ? { placementHorizontal: o.placementHorizontal }
          : {}),
      };
    case "window_group":
      return {
        kind: "window_group",
        ...(typeof o.count === "number" ? { count: o.count } : {}),
        ...(typeof o.layout === "string" && targetSurface
          ? { layout: sanitizeWindowLayout(o.layout, targetSurface) }
          : {}),
      };
  }
}
