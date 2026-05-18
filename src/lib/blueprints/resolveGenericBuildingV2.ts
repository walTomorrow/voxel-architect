import type { EntranceSide } from "./types";
import { parseRoomSurfaceRef } from "./parseRoomSurfaceRef";
import { resolveMaterialPaletteV2 } from "./resolveMaterialPaletteV2";
import type {
  GenericBuildingBlueprintV2,
  GenericBuildingComponentV2,
  RoomComponentV2,
  RoomFace,
  RoomSurfaceRef,
} from "./types/genericBuildingV2";
import type {
  ResolvedComponentV2,
  ResolvedDoorAnchorV2,
  ResolvedDoorApertureV2,
  ResolvedDoorV2,
  ResolvedFacadeOpeningsV2,
  ResolvedGenericBuildingV2,
  ResolvedPorchV2,
  ResolvedRoofV2,
  ResolvedRoomSurfaceV2,
  ResolvedRoomV2,
  ResolvedStepV2,
  ResolvedWindowApertureV2,
} from "./types/resolvedGenericBuildingV2";
import type { PlanBoundsV2 } from "@/src/lib/generation/components/v2/types";
import { facadeInteriorSpan } from "@/src/lib/generation/components/geometry/facadeSides";
import {
  pickWindowSlotsFromAllowed,
  spanForHorizontalPlacement,
} from "@/src/lib/generation/components/v2/facadePlacementV2";

export class ResolveGenericBuildingV2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveGenericBuildingV2Error";
  }
}

function faceToSide(face: RoomFace): EntranceSide | null {
  if (face === "roof") return null;
  return face;
}

function surfaceRef(roomId: string, face: RoomFace): RoomSurfaceRef {
  return `${roomId}.${face}` as RoomSurfaceRef;
}

function requireRoom(
  blueprint: GenericBuildingBlueprintV2,
): RoomComponentV2 {
  const rooms = blueprint.components.filter((c): c is RoomComponentV2 => c.type === "room");
  if (rooms.length !== 1) {
    throw new ResolveGenericBuildingV2Error(
      `Expected exactly one room component, found ${rooms.length}.`,
    );
  }
  return rooms[0]!;
}

function buildSurfaces(
  rootRoom: RoomComponentV2,
): ReadonlyMap<RoomSurfaceRef, ResolvedRoomSurfaceV2> {
  const { id: roomId, width: W, depth: D, wallThickness: T } = rootRoom;
  const faces: RoomFace[] = ["front", "back", "left", "right", "roof"];
  const map = new Map<RoomSurfaceRef, ResolvedRoomSurfaceV2>();

  for (const face of faces) {
    const ref = surfaceRef(roomId, face);
    const side = faceToSide(face);
    if (side === null) {
      map.set(ref, {
        ref,
        roomId,
        face,
        side: null,
        interiorLo: 0,
        interiorHi: 0,
        axis: "x",
      });
      continue;
    }
    const { lo, hi, axis } = facadeInteriorSpan(side, W, D, T);
    map.set(ref, {
      ref,
      roomId,
      face,
      side,
      interiorLo: lo,
      interiorHi: hi,
      axis,
    });
  }
  return map;
}

function windowYFromBand(
  bodyLayers: number,
  heightBand: "auto" | "mid" | "upper",
): number {
  switch (heightBand) {
    case "upper":
      return Math.min(bodyLayers, Math.max(2, bodyLayers));
    case "mid":
      return Math.max(2, Math.floor(bodyLayers / 2));
    case "auto":
    default:
      return Math.max(2, Math.floor(bodyLayers / 2));
  }
}

function computeGrid(
  rootRoom: RoomComponentV2,
  roof: ResolvedRoofV2 | undefined,
  porches: readonly ResolvedPorchV2[],
  steps: readonly ResolvedStepV2[],
): PlanBoundsV2 {
  let width = rootRoom.width;
  let depth = rootRoom.depth;
  const bodyLayers = rootRoom.wallHeight;
  const roofLayers = roof?.kind === "none" ? 0 : (roof?.layers ?? 0);
  const overhang = roof?.overhang ?? 0;

  for (const porch of porches) {
    if (porch.side === "front") depth += porch.depth;
    else if (porch.side === "back") depth += porch.depth;
    else if (porch.side === "left") width += porch.depth;
    else if (porch.side === "right") width += porch.depth;
  }

  if (steps.some((s) => s.anchor.side === "front")) depth += 1;
  else if (steps.some((s) => s.anchor.side === "back")) depth += 1;
  else if (steps.some((s) => s.anchor.side === "left")) width += 1;
  else if (steps.some((s) => s.anchor.side === "right")) width += 1;

  return {
    origin: { x: 0, y: 0, z: 0 },
    width,
    depth,
    bodyLayers,
    roofLayers,
    overhang,
  };
}

function resolveRoofComponent(
  comp: Extract<GenericBuildingComponentV2, { type: "roof" }>,
  blueprint: GenericBuildingBlueprintV2,
  rootRoomId: string,
): ResolvedRoofV2 {
  if (comp.targetRoom !== rootRoomId) {
    throw new ResolveGenericBuildingV2Error(
      `roof "${comp.id}" targetRoom must be root room "${rootRoomId}".`,
    );
  }
  const kind = comp.kind;
  let layers = comp.layers ?? (kind === "pitched_gable" ? 2 : kind === "shed" ? 1 : 0);
  if (kind === "none") layers = 0;
  layers = Math.max(0, Math.min(3, Math.floor(layers)));
  let overhang = comp.overhang ?? 0;
  if (overhang < 0) overhang = 0;
  if (overhang > 1) overhang = 1;

  return {
    id: comp.id,
    type: "roof",
    materials: resolveMaterialPaletteV2(blueprint.materials, comp.materials),
    targetRoom: comp.targetRoom,
    kind,
    layers,
    overhang,
    orientation: comp.orientation,
  };
}

/**
 * Resolve a validated/normalized v2 blueprint into an internal semantic graph.
 * Input must have passed `validateGenericBuildingBlueprintV2`.
 */
export function resolveGenericBuildingV2(
  normalized: GenericBuildingBlueprintV2,
): ResolvedGenericBuildingV2 {
  if (normalized.schemaVersion !== 2) {
    throw new ResolveGenericBuildingV2Error("schemaVersion must be 2.");
  }

  const rootRoom = requireRoom(normalized);
  const rootRoomId = rootRoom.id;
  const surfaces = buildSurfaces(rootRoom);
  const blueprintMaterials = resolveMaterialPaletteV2(normalized.materials);

  const resolvedComponents: ResolvedComponentV2[] = [];
  const doorById = new Map<string, ResolvedDoorV2>();
  const anchors = new Map<string, ResolvedDoorAnchorV2>();
  const doorsByFacade = new Map<EntranceSide, ResolvedDoorApertureV2[]>();
  const windowsByFacade = new Map<EntranceSide, ResolvedWindowApertureV2[]>();

  const pushDoor = (aperture: ResolvedDoorApertureV2) => {
    const list = doorsByFacade.get(aperture.side) ?? [];
    list.push(aperture);
    doorsByFacade.set(aperture.side, list);
  };

  const pushWindow = (aperture: ResolvedWindowApertureV2) => {
    const list = windowsByFacade.get(aperture.side) ?? [];
    list.push(aperture);
    windowsByFacade.set(aperture.side, list);
  };

  const resolveDoor = (comp: Extract<GenericBuildingComponentV2, { type: "door" }>) => {
    const parsed = parseRoomSurfaceRef(comp.attach.targetSurface);
    if (!parsed.ok) {
      throw new ResolveGenericBuildingV2Error(parsed.message);
    }
    const surface = surfaces.get(comp.attach.targetSurface);
    if (!surface?.side) {
      throw new ResolveGenericBuildingV2Error(
        `door "${comp.id}" targets non-wall surface.`,
      );
    }
    const horizontal = comp.attach.placement?.horizontal ?? "center";
    const { spanLo, spanHi } = spanForHorizontalPlacement(
      surface.interiorLo,
      surface.interiorHi,
      comp.width,
      horizontal,
    );
    const aperture: ResolvedDoorApertureV2 = {
      doorId: comp.id,
      surfaceRef: comp.attach.targetSurface,
      side: surface.side,
      width: comp.width,
      height: comp.height,
      horizontal,
      spanLo,
      spanHi,
    };
    const resolved: ResolvedDoorV2 = {
      id: comp.id,
      type: "door",
      materials: resolveMaterialPaletteV2(normalized.materials, comp.materials),
      aperture,
    };
    doorById.set(comp.id, resolved);
    anchors.set(comp.id, {
      doorId: comp.id,
      surfaceRef: comp.attach.targetSurface,
      side: surface.side,
      width: comp.width,
      height: comp.height,
      horizontal,
      spanLo,
      spanHi,
    });
    pushDoor(aperture);
    resolvedComponents.push(resolved);
  };

  for (const comp of normalized.components) {
    if (comp.type === "door") resolveDoor(comp);
  }

  for (const comp of normalized.components) {
    if (comp.type === "door") continue;
    switch (comp.type) {
      case "room": {
        const resolved: ResolvedRoomV2 = {
          id: comp.id,
          type: "room",
          materials: resolveMaterialPaletteV2(normalized.materials, comp.materials),
          width: comp.width,
          depth: comp.depth,
          wallHeight: comp.wallHeight,
          wallThickness: comp.wallThickness,
          hollowInterior: comp.hollowInterior,
          role: comp.role,
        };
        resolvedComponents.push(resolved);
        break;
      }
      case "roof": {
        resolvedComponents.push(resolveRoofComponent(comp, normalized, rootRoomId));
        break;
      }
      case "window_group": {
        const parsed = parseRoomSurfaceRef(comp.attach.targetSurface);
        if (!parsed.ok) {
          throw new ResolveGenericBuildingV2Error(parsed.message);
        }
        const surface = surfaces.get(comp.attach.targetSurface);
        if (!surface?.side) {
          throw new ResolveGenericBuildingV2Error(
            `window_group "${comp.id}" targets non-wall surface.`,
          );
        }
        const horizontal = comp.attach.placement?.horizontal ?? "center";
        const heightBand = comp.heightBand ?? "auto";
        const forbidden = new Set<number>();
        for (const doorList of doorsByFacade.get(surface.side) ?? []) {
          for (let v = doorList.spanLo; v <= doorList.spanHi; v++) forbidden.add(v);
        }
        const allowed: number[] = [];
        for (let v = surface.interiorLo; v <= surface.interiorHi; v++) {
          if (!forbidden.has(v)) allowed.push(v);
        }
        const slots = pickWindowSlotsFromAllowed(
          allowed,
          comp.count,
          comp.layout,
          horizontal,
        );

        const aperture: ResolvedWindowApertureV2 = {
          windowGroupId: comp.id,
          surfaceRef: comp.attach.targetSurface,
          side: surface.side,
          count: comp.count,
          layout: comp.layout,
          heightBand,
          horizontal,
          slots,
          wy: windowYFromBand(rootRoom.wallHeight, heightBand),
        };
        pushWindow(aperture);
        resolvedComponents.push({
          id: comp.id,
          type: "window_group",
          materials: resolveMaterialPaletteV2(normalized.materials, comp.materials),
          aperture,
        });
        break;
      }
      case "porch": {
        const parsed = parseRoomSurfaceRef(comp.attach.targetSurface);
        if (!parsed.ok) {
          throw new ResolveGenericBuildingV2Error(parsed.message);
        }
        const surface = surfaces.get(comp.attach.targetSurface);
        if (!surface?.side) {
          throw new ResolveGenericBuildingV2Error(
            `porch "${comp.id}" targets non-wall surface.`,
          );
        }
        const resolved: ResolvedPorchV2 = {
          id: comp.id,
          type: "porch",
          materials: resolveMaterialPaletteV2(normalized.materials, comp.materials),
          surfaceRef: comp.attach.targetSurface,
          side: surface.side,
          depth: comp.depth,
          widthMode: comp.widthMode,
          horizontal: comp.attach.placement?.horizontal ?? "center",
          aroundDoorId: comp.aroundDoor,
        };
        resolvedComponents.push(resolved);
        break;
      }
      case "chimney": {
        const parsed = parseRoomSurfaceRef(comp.attach.targetSurface);
        if (!parsed.ok) {
          throw new ResolveGenericBuildingV2Error(parsed.message);
        }
        const surface = surfaces.get(comp.attach.targetSurface);
        if (!surface?.side) {
          throw new ResolveGenericBuildingV2Error(
            `chimney "${comp.id}" targets non-wall surface.`,
          );
        }
        resolvedComponents.push({
          id: comp.id,
          type: "chimney",
          materials: resolveMaterialPaletteV2(normalized.materials, comp.materials),
          surfaceRef: comp.attach.targetSurface,
          side: surface.side,
          horizontal: comp.attach.placement?.horizontal ?? "center",
        });
        break;
      }
      case "step": {
        const anchor = anchors.get(comp.attach.targetDoor);
        if (!anchor) {
          throw new ResolveGenericBuildingV2Error(
            `step "${comp.id}" targetDoor "${comp.attach.targetDoor}" is not a resolved door.`,
          );
        }
        const resolved: ResolvedStepV2 = {
          id: comp.id,
          type: "step",
          materials: resolveMaterialPaletteV2(normalized.materials, comp.materials),
          targetDoorId: comp.attach.targetDoor,
          anchor,
        };
        resolvedComponents.push(resolved);
        break;
      }
      default: {
        const unknown = comp as { type?: string; id?: string };
        throw new ResolveGenericBuildingV2Error(
          `Unknown component type "${unknown.type ?? "?"}" (${unknown.id ?? "?"}).`,
        );
      }
    }
  }

  const roof = resolvedComponents.find((c): c is ResolvedRoofV2 => c.type === "roof");
  const porches = resolvedComponents.filter((c): c is ResolvedPorchV2 => c.type === "porch");
  const steps = resolvedComponents.filter((c): c is ResolvedStepV2 => c.type === "step");
  const grid = computeGrid(rootRoom, roof, porches, steps);

  const openingsByFacade = new Map<EntranceSide, ResolvedFacadeOpeningsV2>();
  const sides: EntranceSide[] = ["front", "back", "left", "right"];
  for (const side of sides) {
    openingsByFacade.set(side, {
      side,
      doors: doorsByFacade.get(side) ?? [],
      windows: windowsByFacade.get(side) ?? [],
    });
  }

  return {
    structureType: "generic_building",
    schemaVersion: 2,
    metadata: normalized.metadata,
    constraints: normalized.constraints,
    rootRoomId,
    origin: { x: 0, y: 0, z: 0 },
    grid,
    materials: blueprintMaterials,
    surfaces,
    anchors,
    openingsByFacade,
    components: resolvedComponents,
  };
}
