import type { EntranceSide } from "@/src/lib/blueprints/types";
import type { ResolvedGenericBuildingV2 } from "@/src/lib/blueprints/types/resolvedGenericBuildingV2";
import { localApertureKey } from "@/src/lib/generation/components/geometry/localKeys";
import type { DerivedOpeningsV2 } from "./types";

function addDoorMask(
  mask: Set<string>,
  side: EntranceSide,
  W: number,
  D: number,
  spanLo: number,
  spanHi: number,
  height: number,
): void {
  for (let y = 1; y <= height; y++) {
    if (side === "front") {
      for (let lx = spanLo; lx <= spanHi; lx++) {
        mask.add(localApertureKey(lx, y, D - 1));
      }
    } else if (side === "back") {
      for (let lx = spanLo; lx <= spanHi; lx++) {
        mask.add(localApertureKey(lx, y, 0));
      }
    } else if (side === "left") {
      for (let lz = spanLo; lz <= spanHi; lz++) {
        mask.add(localApertureKey(0, y, lz));
      }
    } else {
      for (let lz = spanLo; lz <= spanHi; lz++) {
        mask.add(localApertureKey(W - 1, y, lz));
      }
    }
  }
}

function addWindowCell(
  windowMask: Set<string>,
  shellSkip: Set<string>,
  side: EntranceSide,
  W: number,
  D: number,
  axis: "x" | "z",
  v: number,
  wy: number,
): void {
  if (axis === "x") {
    const lz = side === "front" ? D - 1 : 0;
    const key = localApertureKey(v, wy, lz);
    windowMask.add(key);
    shellSkip.add(key);
  } else {
    const lx = side === "left" ? 0 : W - 1;
    const key = localApertureKey(lx, wy, v);
    windowMask.add(key);
    shellSkip.add(key);
  }
}

/**
 * Merge door/window aperture cells into plan-level masks (room-local coordinates).
 */
export function deriveApertureMasksV2(
  resolved: ResolvedGenericBuildingV2,
): DerivedOpeningsV2 {
  const shellSkipMask = new Set<string>();
  const windowMask = new Set<string>();
  const doorMask = new Set<string>();

  const room = resolved.components.find((c) => c.id === resolved.rootRoomId && c.type === "room");
  if (!room || room.type !== "room") {
    return { shellSkipMask, windowMask, doorMask };
  }

  const W = room.width;
  const D = room.depth;

  for (const comp of resolved.components) {
    if (comp.type === "door") {
      const { side, spanLo, spanHi, height } = comp.aperture;
      addDoorMask(doorMask, side, W, D, spanLo, spanHi, height);
    }
  }

  for (const k of doorMask) shellSkipMask.add(k);

  for (const comp of resolved.components) {
    if (comp.type !== "window_group") continue;
    const { side, slots, wy } = comp.aperture;
    const surface = resolved.surfaces.get(comp.aperture.surfaceRef);
    const axis = surface?.axis ?? (side === "front" || side === "back" ? "x" : "z");
    for (const v of slots) {
      addWindowCell(windowMask, shellSkipMask, side, W, D, axis, v, wy);
    }
  }

  return { shellSkipMask, windowMask, doorMask };
}
