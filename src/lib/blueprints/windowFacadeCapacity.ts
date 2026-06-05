import { normalizeWindowTreatment } from "@/src/lib/blueprints/windowTreatment";
import type {
  GenericBuildingBlueprintV2,
  RoomFace,
  RoomSurfaceRef,
  WindowGroupComponentV2,
  WindowLayoutV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { EntranceSide } from "@/src/lib/blueprints/types";
import { facadeInteriorSpan } from "@/src/lib/generation/components/geometry/facadeSides";
import { findRootRoom } from "@/src/lib/builder/blueprintComponentIndex";

function faceToEntranceSide(face: RoomFace): EntranceSide | null {
  if (face === "roof") return null;
  return face;
}

export function parseRoomFaceFromSurface(surface: RoomSurfaceRef): RoomFace | null {
  const parts = surface.split(".");
  const face = parts[parts.length - 1];
  if (face === "front" || face === "back" || face === "left" || face === "right" || face === "roof") {
    return face;
  }
  return null;
}

export function facadeSpanLengthForRoom(
  width: number,
  depth: number,
  wallThickness: number,
  face: RoomFace,
): number {
  const side = faceToEntranceSide(face);
  if (!side) return 0;
  const { lo, hi } = facadeInteriorSpan(side, width, depth, wallThickness);
  return Math.max(0, hi - lo + 1);
}

/** Max window slots with minimum spacing on a façade interior span (matches v2 validator). */
export function maxWindowSlotsOnFacadeSpan(spanLen: number): number {
  if (spanLen < 3) return 0;
  return Math.max(0, Math.floor((spanLen + 1) / 3));
}

export function defaultWindowLayoutForSurface(surface: RoomSurfaceRef): WindowLayoutV2 {
  return surface.endsWith(".front") ? "symmetric" : "even";
}

export function sanitizeWindowLayout(
  layout: unknown,
  surface: RoomSurfaceRef,
): WindowLayoutV2 {
  if (layout === "symmetric" || layout === "even") {
    return layout;
  }
  if (typeof layout === "string") {
    const l = layout.toLowerCase().trim();
    if (l.includes("symmet")) return "symmetric";
    if (l.includes("even") || l === "center" || l === "centered" || l === "single") {
      return "even";
    }
  }
  return defaultWindowLayoutForSurface(surface);
}

export function getFacadeSpanLengthForSurface(
  blueprint: GenericBuildingBlueprintV2,
  surface: RoomSurfaceRef,
): number {
  const room = findRootRoom(blueprint);
  if (!room) return 0;
  const face = parseRoomFaceFromSurface(surface);
  if (!face || face === "roof") return 0;
  return facadeSpanLengthForRoom(room.width, room.depth, room.wallThickness ?? 1, face);
}

export function getMaxWindowSlotsForSurface(
  blueprint: GenericBuildingBlueprintV2,
  surface: RoomSurfaceRef,
): number {
  return maxWindowSlotsOnFacadeSpan(getFacadeSpanLengthForSurface(blueprint, surface));
}

export function findWindowGroupOnSurface(
  blueprint: GenericBuildingBlueprintV2,
  surface: RoomSurfaceRef,
): WindowGroupComponentV2 | undefined {
  return blueprint.components.find(
    (c): c is WindowGroupComponentV2 =>
      c.type === "window_group" && c.attach.targetSurface === surface,
  );
}

export function clampWindowCountForSurface(
  blueprint: GenericBuildingBlueprintV2,
  surface: RoomSurfaceRef,
  count: number,
): number {
  const max = getMaxWindowSlotsForSurface(blueprint, surface);
  if (max <= 0) return 0;
  return Math.min(Math.max(0, Math.round(count)), max);
}

export function inferWindowCountFromPrompt(
  prompt: string | undefined,
  requested: number | undefined,
  surface: RoomSurfaceRef,
  blueprint: GenericBuildingBlueprintV2,
): number {
  const max = getMaxWindowSlotsForSurface(blueprint, surface);
  if (max <= 0) return 0;

  if (requested !== undefined && Number.isFinite(requested)) {
    return clampWindowCountForSurface(blueprint, surface, requested);
  }

  const text = prompt?.toLowerCase() ?? "";
  if (/\ba window\b/.test(text) && !/\bwindows\b/.test(text)) {
    return clampWindowCountForSurface(blueprint, surface, 1);
  }

  const existing = findWindowGroupOnSurface(blueprint, surface);
  if (existing) {
    return existing.count;
  }

  const defaultCount = surface.endsWith(".front") ? 2 : 2;
  return clampWindowCountForSurface(blueprint, surface, defaultCount);
}

export function sanitizeWindowGroupComponent(
  component: WindowGroupComponentV2,
  blueprint: GenericBuildingBlueprintV2,
): WindowGroupComponentV2 {
  const surface = component.attach.targetSurface;
  const layout = sanitizeWindowLayout(component.layout, surface);
  const count = clampWindowCountForSurface(blueprint, surface, component.count);
  return {
    ...component,
    layout,
    count,
    heightBand: component.heightBand ?? "mid",
    windowTreatment: normalizeWindowTreatment(component.windowTreatment),
  };
}
