import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type { ResolvedMedievalTower } from "@/src/lib/blueprints/types";
import type { VoxelBlock } from "@/src/lib/voxel/types";

/**
 * Deterministic merge: higher priority wins; equal priority → later placement wins.
 * (Larger number = higher priority.)
 */
const PRI = {
  FOUNDATION: 10,
  INTERIOR_FLOOR: 20,
  WALL: 30,
  ROOF: 40,
  CORNER_PILLAR: 45,
  WINDOW: 50,
  DOOR: 55,
  CRENEL: 60,
} as const;

type Placement = {
  x: number;
  y: number;
  z: number;
  p: number;
  id: BlockTypeId;
  i: number;
};

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function centerOrigin(n: number): number {
  return -Math.floor(n / 2);
}

function mergePlacements(placements: Placement[]): VoxelBlock[] {
  placements.sort((a, b) => b.p - a.p || b.i - a.i);
  const seen = new Set<string>();
  const out: VoxelBlock[] = [];
  for (const q of placements) {
    const k = key(q.x, q.y, q.z);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ x: q.x, y: q.y, z: q.z, blockTypeId: q.id });
  }
  return out;
}

function filterGrounded(
  blocks: readonly VoxelBlock[],
  allowFloating: boolean,
): VoxelBlock[] {
  if (allowFloating) return [...blocks];
  const below = new Set(blocks.map((b) => key(b.x, b.y, b.z)));
  return blocks.filter((b) => {
    if (b.y <= 0) return true;
    return below.has(key(b.x, b.y - 1, b.z));
  });
}

function inInteriorVoid(
  W: number,
  D: number,
  T: number,
  lx: number,
  lz: number,
): boolean {
  return lx >= T && lx < W - T && lz >= T && lz < D - T;
}

function onFace(
  side: ResolvedMedievalTower["openings"]["entranceSide"],
  lx: number,
  lz: number,
  W: number,
  D: number,
): boolean {
  switch (side) {
    case "front":
      return lz === D - 1;
    case "back":
      return lz === 0;
    case "left":
      return lx === 0;
    case "right":
      return lx === W - 1;
    default:
      return false;
  }
}

function entranceSpanRange(
  span: number,
  entranceWidth: number,
): { lo: number; hi: number } {
  const lo = Math.max(1, Math.floor((span - entranceWidth) / 2));
  const hi = Math.min(span - 2, lo + entranceWidth - 1);
  return { lo, hi };
}

function windowFloorOk(
  y: number,
  bodyLayers: number,
  mode: ResolvedMedievalTower["openings"]["windowsFloors"],
): boolean {
  if (mode === "none") return false;
  if (mode === "all") return y >= 1 && y <= bodyLayers;
  return y > Math.ceil(bodyLayers / 2) && y <= bodyLayers;
}

function windowStyleStride(
  s: ResolvedMedievalTower["openings"]["windowsStyle"],
): number {
  switch (s) {
    case "narrow":
      return 4;
    case "arched":
      return 3;
    default:
      return 3;
  }
}

function isExterior(lx: number, lz: number, W: number, D: number): boolean {
  return lx === 0 || lx === W - 1 || lz === 0 || lz === D - 1;
}

function isCorner(lx: number, lz: number, W: number, D: number): boolean {
  return isExterior(lx, lz, W, D) && (lx === 0 || lx === W - 1) && (lz === 0 || lz === D - 1);
}

function shouldPlaceWindow(
  r: ResolvedMedievalTower,
  lx: number,
  lz: number,
  y: number,
  W: number,
  D: number,
  H: number,
): boolean {
  if (r.openings.windowsPlacement === "none") return false;
  if (r.openings.windowsCountPerSide <= 0) return false;
  if (!windowFloorOk(y, H, r.openings.windowsFloors)) return false;
  if (!isExterior(lx, lz, W, D) || isCorner(lx, lz, W, D)) return false;

  if (r.openings.windowsPlacement === "front_only" && lz !== D - 1) {
    return false;
  }

  const stride = windowStyleStride(r.openings.windowsStyle);
  if ((lx * 5 + lz * 7 + y * 11) % stride !== 0) return false;

  const span = lz === 0 || lz === D - 1 ? W : D;
  const along = lz === 0 || lz === D - 1 ? lx : lz;
  const slots = Math.max(1, span - 2);
  const step = Math.max(
    1,
    Math.floor(slots / Math.max(1, r.openings.windowsCountPerSide)),
  );
  const u = along - 1;
  if (u < 0 || u >= slots) return false;
  return u % step === 0;
}

/**
 * `THREE.BoxGeometry` multi-material slot order used by `VoxelViewer`:
 * +X, -X, +Y (top), -Y (bottom), +Z, -Z.
 *
 * `topSideBottom` registry faces map as:
 *   side  → +X, -X, +Z, -Z
 *   top   → +Y
 *   bottom→ -Y
 *
 * Logs in the blueprint use the same `topSideBottom` binding in pack data
 * (bottom often reuses the top / end-grain texture).
 */
export function generateMedievalTower(
  r: ResolvedMedievalTower,
): VoxelBlock[] {
  const W = r.grid.width;
  const D = r.grid.depth;
  const H = r.grid.bodyLayers;
  const T = r.massing.wallThickness;
  const ox = centerOrigin(W);
  const oz = centerOrigin(D);
  const m = r.materials;
  const pl: Placement[] = [];
  let idx = 0;
  const push = (
    lx: number,
    y: number,
    lz: number,
    p: number,
    id: BlockTypeId,
  ) => {
    pl.push({
      x: ox + lx,
      y,
      z: oz + lz,
      p,
      id,
      i: idx++,
    });
  };

  const { lo: elx0, hi: elx1 } = entranceSpanRange(W, r.openings.entranceWidth);
  const { lo: elz0, hi: elz1 } = entranceSpanRange(D, r.openings.entranceWidth);
  const ehy = Math.min(r.openings.entranceHeight, H);

  const inDoorAperture = (lx: number, lz: number, y: number): boolean => {
    if (y < 1 || y > ehy) return false;
    if (!onFace(r.openings.entranceSide, lx, lz, W, D)) return false;
    if (r.openings.entranceSide === "front" || r.openings.entranceSide === "back") {
      return lx >= elx0 && lx <= elx1;
    }
    return lz >= elz0 && lz <= elz1;
  };

  for (let lx = 0; lx < W; lx++) {
    for (let lz = 0; lz < D; lz++) {
      push(lx, 0, lz, PRI.FOUNDATION, m.floor);
    }
  }

  for (let y = 1; y <= H; y++) {
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        if (inDoorAperture(lx, lz, y)) continue;

        const voidCell =
          r.massing.hollowInterior && inInteriorVoid(W, D, T, lx, lz);

        if (voidCell) {
          if (
            r.levels.includeInteriorFloors &&
            y >= 1 &&
            y <= r.levels.floorCount
          ) {
            push(lx, y, lz, PRI.INTERIOR_FLOOR, m.floor);
          }
          continue;
        }

        if (r.features.cornerPillars && isCorner(lx, lz, W, D)) {
          push(lx, y, lz, PRI.CORNER_PILLAR, m.accent);
          continue;
        }

        if (shouldPlaceWindow(r, lx, lz, y, W, D, H)) {
          push(lx, y, lz, PRI.WINDOW, m.window);
        } else {
          push(lx, y, lz, PRI.WALL, m.wall);
        }
      }
    }
  }

  const doorY0 = 1;
  const side = r.openings.entranceSide;
  if (side === "front" || side === "back") {
    const lz = side === "front" ? D - 1 : 0;
    for (let lx = elx0; lx <= elx1; lx++) {
      push(lx, doorY0, lz, PRI.DOOR, m.door);
    }
    if (r.openings.entranceStyle === "arched" && ehy >= 3) {
      const mid = Math.floor((elx0 + elx1) / 2);
      const yArch = Math.min(2, ehy);
      push(mid, yArch, lz, PRI.DOOR, m.door);
    }
  } else {
    const lx = side === "right" ? W - 1 : 0;
    for (let lz = elz0; lz <= elz1; lz++) {
      push(lx, doorY0, lz, PRI.DOOR, m.door);
    }
    if (r.openings.entranceStyle === "arched" && ehy >= 3) {
      const mid = Math.floor((elz0 + elz1) / 2);
      const yArch = Math.min(2, ehy);
      push(lx, yArch, mid, PRI.DOOR, m.door);
    }
  }

  const roofBaseY = H + 1;
  if (r.roof.style === "flat") {
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        push(lx, roofBaseY, lz, PRI.ROOF, m.roof);
      }
    }
  } else {
    for (let layer = 0; layer < r.grid.roofLayers; layer++) {
      const inset = layer;
      const rw = W - 2 * inset;
      const rd = D - 2 * inset;
      if (rw < 1 || rd < 1) break;
      const y = roofBaseY + layer;
      for (let lx = 0; lx < rw; lx++) {
        for (let lz = 0; lz < rd; lz++) {
          const isPer = lx === 0 || lx === rw - 1 || lz === 0 || lz === rd - 1;
          if (!isPer) continue;
          push(inset + lx, y, inset + lz, PRI.ROOF, m.roof);
        }
      }
    }
  }

  if (r.features.crenellations) {
    const y = roofBaseY;
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        if (!isExterior(lx, lz, W, D) || isCorner(lx, lz, W, D)) continue;
        if ((lx + lz + y) % 2 === 0) {
          push(lx, y, lz, PRI.CRENEL, m.accent);
        }
      }
    }
  }

  let blocks = mergePlacements(pl);

  if (r.constraints.requireGroundedStructure || !r.constraints.allowFloatingBlocks) {
    blocks = filterGrounded(blocks, r.constraints.allowFloatingBlocks);
  }

  return blocks;
}
