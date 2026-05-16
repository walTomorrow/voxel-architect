import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type { ResolvedBlacksmithWorkshop } from "@/src/lib/blueprints/types";
import { isShapeAllowedForBlockType } from "@/src/lib/voxel/blocks/materialMetaHelpers";
import { paneAxisForWindowCell } from "@/src/lib/generation/generators/generateMedievalTower";
import type {
  VoxelBlock,
  VoxelBlockShapeKind,
  VoxelBlockState,
} from "@/src/lib/voxel/types";

const PRI = {
  FOUNDATION: 10,
  INTERIOR_FLOOR: 20,
  WALL: 30,
  FORGE: 42,
  WORKBENCH: 43,
  STORAGE: 44,
  ROOF: 50,
  WINDOW: 52,
  DOOR: 55,
  CHIMNEY: 60,
} as const;

type Placement = {
  x: number;
  y: number;
  z: number;
  p: number;
  id: BlockTypeId;
  i: number;
  shapeKind?: VoxelBlockShapeKind;
  state?: VoxelBlockState;
};

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function lk(lx: number, y: number, lz: number): string {
  return `${lx},${y},${lz}`;
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
    const block: VoxelBlock =
      q.shapeKind !== undefined
        ? {
            x: q.x,
            y: q.y,
            z: q.z,
            blockTypeId: q.id,
            shapeKind: q.shapeKind,
            ...(q.state !== undefined ? { state: q.state } : {}),
          }
        : { x: q.x, y: q.y, z: q.z, blockTypeId: q.id };
    out.push(block);
  }
  return out;
}

function filterGrounded(
  blocks: readonly VoxelBlock[],
  allowFloating: boolean,
): VoxelBlock[] {
  if (allowFloating) return [...blocks];
  const sorted = [...blocks].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.z - b.z,
  );
  const grounded = new Set<string>();
  const out: VoxelBlock[] = [];
  for (const b of sorted) {
    const k = key(b.x, b.y, b.z);
    if (b.y <= 0 || grounded.has(key(b.x, b.y - 1, b.z))) {
      grounded.add(k);
      out.push(b);
    }
  }
  return out;
}

function isExterior(lx: number, lz: number, W: number, D: number): boolean {
  return lx === 0 || lx === W - 1 || lz === 0 || lz === D - 1;
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
  side: ResolvedBlacksmithWorkshop["openings"]["entranceSide"],
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

/** Symmetric window column positions along a 1D edge span [0, span-1]. */
function windowPositionsAlong(span: number, count: number): number[] {
  if (count <= 0 || span < 3) return [];
  const innerLo = 1;
  const innerHi = span - 2;
  const usable = innerHi - innerLo + 1;
  if (count >= usable) {
    const all: number[] = [];
    for (let i = innerLo; i <= innerHi; i++) all.push(i);
    return all;
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    out.push(innerLo + Math.floor(t * (usable - 1)));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export function generateBlacksmithWorkshop(
  r: ResolvedBlacksmithWorkshop,
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
    partial?: { shapeKind: VoxelBlockShapeKind; state: VoxelBlockState },
  ) => {
    const row: Placement = {
      x: ox + lx,
      y,
      z: oz + lz,
      p,
      id,
      i: idx++,
    };
    if (partial) {
      row.shapeKind = partial.shapeKind;
      row.state = partial.state;
    }
    pl.push(row);
  };

  const { lo: elx0, hi: elx1 } = entranceSpanRange(W, r.openings.entranceWidth);
  const ehy = Math.min(r.openings.entranceHeight, H);
  const side = r.openings.entranceSide;

  const inDoorAperture = (lx: number, lz: number, y: number): boolean => {
    if (y < 1 || y > ehy) return false;
    if (!onFace(side, lx, lz, W, D)) return false;
    if (side === "front" || side === "back") {
      return lx >= elx0 && lx <= elx1;
    }
    const { lo: elz0, hi: elz1 } = entranceSpanRange(D, r.openings.entranceWidth);
    return lz >= elz0 && lz <= elz1;
  };

  const windowY = Math.min(H, Math.max(2, H - 1));
  const frontWindowLx = new Set(
    windowPositionsAlong(W, r.openings.windowsCount),
  );
  const sideWindowLz = new Set(
    windowPositionsAlong(D, Math.max(0, Math.floor(r.openings.windowsCount / 2))),
  );

  const isWindowCell = (lx: number, lz: number, y: number): boolean => {
    if (y !== windowY) return false;
    if (r.openings.windowsPlacement === "none") return false;
    if (inDoorAperture(lx, lz, y)) return false;
    if (lz === D - 1 && frontWindowLx.has(lx)) return true;
    if (
      r.openings.windowsPlacement === "front_and_sides" &&
      (lx === 0 || lx === W - 1) &&
      sideWindowLz.has(lz)
    ) {
      return true;
    }
    return false;
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

        if (r.massing.hollowInterior && inInteriorVoid(W, D, T, lx, lz)) {
          if (y === 1) {
            push(lx, y, lz, PRI.INTERIOR_FLOOR, m.floor);
          }
          continue;
        }

        if (isWindowCell(lx, lz, y)) {
          const axis = paneAxisForWindowCell(lx, lz, W, D);
          if (
            axis !== undefined &&
            isShapeAllowedForBlockType(m.window, "pane")
          ) {
            push(lx, y, lz, PRI.WINDOW, m.window, {
              shapeKind: "pane",
              state: { axis },
            });
          } else {
            push(lx, y, lz, PRI.WINDOW, m.window);
          }
        } else {
          push(lx, y, lz, PRI.WALL, m.wall);
        }
      }
    }
  }

  const doorY = 1;
  if (side === "front" || side === "back") {
    const lz = side === "front" ? D - 1 : 0;
    for (let lx = elx0; lx <= elx1; lx++) {
      push(lx, doorY, lz, PRI.DOOR, m.door);
    }
  } else {
    const lx = side === "right" ? W - 1 : 0;
    const { lo: elz0, hi: elz1 } = entranceSpanRange(D, r.openings.entranceWidth);
    for (let lz = elz0; lz <= elz1; lz++) {
      push(lx, doorY, lz, PRI.DOOR, m.door);
    }
  }

  const innerW = W - 2 * T;
  const innerD = D - 2 * T;
  const cx = T + Math.floor(innerW / 2);
  const cz = T + Math.floor(innerD / 2);

  if (r.massing.hollowInterior && r.features.forge.enabled) {
    const forgeLz = T + 1;
    push(cx, 1, forgeLz, PRI.FORGE, m.accent);
    if (cx - 1 >= T) push(cx - 1, 1, forgeLz, PRI.FORGE, m.wall);
    if (cx + 1 < W - T) push(cx + 1, 1, forgeLz, PRI.FORGE, m.wall);
    if (forgeLz + 1 < D - T) {
      push(cx, 1, forgeLz + 1, PRI.FORGE, m.accent);
    }
  }

  if (r.massing.hollowInterior && r.features.workbench.enabled) {
    const benchLz = D - T - 2;
    push(cx, 1, benchLz, PRI.WORKBENCH, m.door);
    if (cx + 1 < W - T) push(cx + 1, 1, benchLz, PRI.WORKBENCH, m.door);
  }

  if (r.massing.hollowInterior && r.features.storage.enabled) {
    const sx = T;
    const sz = T;
    push(sx, 1, sz, PRI.STORAGE, m.door);
    if (sz + 1 < D - T) push(sx, 1, sz + 1, PRI.STORAGE, m.door);
    if (sx + 1 < W - T) push(sx + 1, 1, sz, PRI.STORAGE, m.door);
  }

  const roofBaseY = H + 1;
  const R = r.grid.roofLayers;

  for (let layer = 0; layer < R; layer++) {
    const inset =
      r.roof.style === "shed"
        ? Math.min(layer, Math.floor(layer * 1.5))
        : layer;
    const rw = W - 2 * inset;
    const rd = D - 2 * inset;
    if (rw < 1 || rd < 1) break;
    const y = roofBaseY + layer;
    for (let lx = 0; lx < rw; lx++) {
      for (let lz = 0; lz < rd; lz++) {
        const wx = inset + lx;
        const wz = inset + lz;
        if (r.roof.style === "pitched_gable") {
          const isPer =
            lx === 0 || lx === rw - 1 || lz === 0 || lz === rd - 1;
          if (!isPer && layer < R - 1) continue;
        }
        push(wx, y, wz, PRI.ROOF, m.roof);
      }
    }
  }

  if (r.features.chimney.enabled) {
    const lx =
      r.features.chimney.side === "left" ? 0 : W - 1;
    const lz = Math.min(D - 2, Math.max(1, Math.floor(D / 2)));
    const chimneyTop = roofBaseY + R + 1;
    for (let y = 1; y <= chimneyTop; y++) {
      push(lx, y, lz, PRI.CHIMNEY, m.accent);
    }
  }

  let blocks = mergePlacements(pl);

  if (r.constraints.requireGroundedStructure || !r.constraints.allowFloatingBlocks) {
    blocks = filterGrounded(blocks, r.constraints.allowFloatingBlocks);
  }

  return blocks;
}
