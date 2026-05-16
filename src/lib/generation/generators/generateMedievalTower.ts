import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type { ResolvedMedievalTower } from "@/src/lib/blueprints/types";
import { isShapeAllowedForBlockType } from "@/src/lib/voxel/blocks/materialMetaHelpers";
import type {
  VoxelBlock,
  VoxelBlockShapeKind,
  VoxelBlockState,
} from "@/src/lib/voxel/types";

/**
 * Deterministic merge: higher priority wins first; first placement kept per voxel.
 * Sort: descending `p`, then descending insertion index `i`.
 */
const PRI = {
  FOUNDATION: 10,
  INTERIOR_FLOOR: 20,
  WALL: 30,
  ROOF: 40,
  FACADE_TRIM: 44,
  CORNER_PILLAR: 45,
  CORNER_CAPSTONE: 48,
  WINDOW: 50,
  PORTAL_ACCENT: 52,
  ENTRANCE_ARCH: 53,
  DOOR: 55,
  PARAPET: 56,
  MERLON: 58,
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

function colKey(lx: number, lz: number): string {
  return `${lx},${lz}`;
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

/**
 * Pane thickness axis for a façade window cell (generator-authored hint).
 * Not connection-aware — future neighbor-derived panes belong in backlog work.
 *
 * - Front/back façades (constant `lz`): thin extent along world Z → `axis: "x"`.
 * - Left/right façades (constant `lx`): thin extent along world X → `axis: "z"`.
 */
export function paneAxisForWindowCell(
  lx: number,
  lz: number,
  W: number,
  D: number,
): "x" | "z" | undefined {
  const onFrontBack = lz === 0 || lz === D - 1;
  const onLeftRight = lx === 0 || lx === W - 1;
  if (onFrontBack && !onLeftRight) return "x";
  if (onLeftRight && !onFrontBack) return "z";
  return undefined;
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

function windowColumnHeight(
  style: ResolvedMedievalTower["openings"]["windowsStyle"],
): number {
  switch (style) {
    case "narrow":
      return 3;
    case "arched":
      return 2;
    default:
      return 2;
  }
}

function isExterior(lx: number, lz: number, W: number, D: number): boolean {
  return lx === 0 || lx === W - 1 || lz === 0 || lz === D - 1;
}

function isCorner(lx: number, lz: number, W: number, D: number): boolean {
  return (
    isExterior(lx, lz, W, D) &&
    (lx === 0 || lx === W - 1) &&
    (lz === 0 || lz === D - 1)
  );
}

/**
 * Try to place exactly `want` window columns on [lo, hi] inclusive, symmetric about
 * the edge midpoint, with |p − q| ≥ `minGap` for every pair. Returns [] if impossible.
 */
function tryPlaceSymmetricAlong(
  lo: number,
  hi: number,
  want: number,
  minGap: number,
): number[] {
  if (want <= 0 || lo > hi) return [];
  const center = (lo + hi) / 2;
  const picked: number[] = [];
  const ok = (p: number) =>
    p >= lo &&
    p <= hi &&
    picked.every((q) => Math.abs(p - q) >= minGap);

  if (want % 2 === 1) {
    const mid = Math.round(center);
    const midClamped = Math.max(lo, Math.min(hi, mid));
    if (!ok(midClamped)) return [];
    picked.push(midClamped);
  }

  let d = 1;
  while (picked.length < want) {
    const L = Math.ceil(center - d);
    const R = Math.floor(center + d);
    if (L < lo && R > hi) break;
    if (
      L < R &&
      L >= lo &&
      R <= hi &&
      ok(L) &&
      ok(R) &&
      R - L >= minGap
    ) {
      picked.push(L, R);
      d++;
      continue;
    }
    d++;
    if (d > hi - lo + 5) break;
  }

  picked.sort((a, b) => a - b);
  return picked.length === want ? picked : [];
}

/** Symmetric facade slots: degrade count (never asymmetric) until placement fits. */
function symmetricAlongSlots(
  lo: number,
  hi: number,
  requestedCount: number,
  minGap: number,
): number[] {
  const maxFit = hi - lo + 1;
  if (maxFit <= 0 || requestedCount <= 0) return [];
  for (let want = Math.min(requestedCount, maxFit); want >= 1; want--) {
    const s = tryPlaceSymmetricAlong(lo, hi, want, minGap);
    if (s.length === want) return s;
  }
  return [];
}

/**
 * Interior along indices reserved for portal (door span + jambs) on the entrance façade.
 * Only indices in [interiorLo, interiorHi] are returned (corners already excluded from callers).
 */
function portalAlongForbiddenInterior(
  el0: number,
  el1: number,
  interiorLo: number,
  interiorHi: number,
): Set<number> {
  const s = new Set<number>();
  for (let v = el0; v <= el1; v++) {
    if (v >= interiorLo && v <= interiorHi) s.add(v);
  }
  const jL = el0 - 1;
  if (jL >= interiorLo && jL <= interiorHi) s.add(jL);
  const jR = el1 + 1;
  if (jR >= interiorLo && jR <= interiorHi) s.add(jR);
  return s;
}

function buildAllowedInteriorAlong(
  interiorLo: number,
  interiorHi: number,
  forbidden: ReadonlySet<number>,
): number[] {
  const out: number[] = [];
  for (let v = interiorLo; v <= interiorHi; v++) {
    if (!forbidden.has(v)) out.push(v);
  }
  return out;
}

/**
 * Like `tryPlaceSymmetricAlong`, but each pick must lie in `allowed` (portal-reserved façade).
 */
function tryPlaceSymmetricOnAllowed(
  allowed: ReadonlySet<number>,
  lo: number,
  hi: number,
  want: number,
  minGap: number,
): number[] {
  if (want <= 0 || lo > hi) return [];
  const center = (lo + hi) / 2;
  const picked: number[] = [];
  const ok = (p: number) =>
    allowed.has(p) &&
    picked.every((q) => Math.abs(p - q) >= minGap);

  if (want % 2 === 1) {
    const mid = Math.round(center);
    const midClamped = Math.max(lo, Math.min(hi, mid));
    let chosen: number | undefined;
    if (ok(midClamped)) {
      chosen = midClamped;
    } else {
      // Geometric center may sit in the portal reserve. Closest allowed index to façade
      // midpoint; equal distance → smaller index (deterministic).
      let bestDist = Infinity;
      for (const a of allowed) {
        if (!ok(a)) continue;
        const dist = Math.abs(a - center);
        if (dist < bestDist || (dist === bestDist && (chosen === undefined || a < chosen))) {
          bestDist = dist;
          chosen = a;
        }
      }
    }
    if (chosen === undefined) return [];
    picked.push(chosen);
  }

  let d = 1;
  while (picked.length < want) {
    const L = Math.ceil(center - d);
    const R = Math.floor(center + d);
    if (L < lo && R > hi) break;
    if (
      L < R &&
      L >= lo &&
      R <= hi &&
      ok(L) &&
      ok(R) &&
      R - L >= minGap
    ) {
      picked.push(L, R);
      d++;
      continue;
    }
    d++;
    if (d > hi - lo + 5) break;
  }

  picked.sort((a, b) => a - b);
  return picked.length === want ? picked : [];
}

function symmetricAlongSlotsFromAllowed(
  allowed: readonly number[],
  requestedCount: number,
  minGap: number,
  facadeLo: number,
  facadeHi: number,
): number[] {
  if (allowed.length === 0 || requestedCount <= 0) return [];
  const allowedSet = new Set(allowed);
  const maxFit = allowed.length;
  for (let want = Math.min(requestedCount, maxFit); want >= 1; want--) {
    const s = tryPlaceSymmetricOnAllowed(
      allowedSet,
      facadeLo,
      facadeHi,
      want,
      minGap,
    );
    if (s.length === want) return s;
  }
  return [];
}

/**
 * Deterministic façade window columns: corners excluded; door columns can remain in
 * the set — per-floor `inDoorAperture` suppresses glass where the portal occupies.
 */
function buildWindowColumnKeySet(
  r: ResolvedMedievalTower,
  W: number,
  D: number,
  elx0: number,
  elx1: number,
  elz0: number,
  elz1: number,
): Set<string> {
  const set = new Set<string>();
  const placement = r.openings.windowsPlacement;
  if (placement === "none" || r.openings.windowsCountPerSide <= 0) {
    return set;
  }

  const minGap = windowStyleStride(r.openings.windowsStyle);
  const count = r.openings.windowsCountPerSide;
  const loX = 1;
  const hiX = W - 2;
  const loZ = 1;
  const hiZ = D - 2;

  let slotsFrontX = symmetricAlongSlots(loX, hiX, count, minGap);
  let slotsBackX = symmetricAlongSlots(loX, hiX, count, minGap);
  let slotsLeftZ = symmetricAlongSlots(loZ, hiZ, count, minGap);
  let slotsRightZ = symmetricAlongSlots(loZ, hiZ, count, minGap);

  const entrance = r.openings.entranceSide;
  const forbiddenX = portalAlongForbiddenInterior(elx0, elx1, loX, hiX);
  const forbiddenZ = portalAlongForbiddenInterior(elz0, elz1, loZ, hiZ);

  if (entrance === "front") {
    const allowed = buildAllowedInteriorAlong(loX, hiX, forbiddenX);
    slotsFrontX = symmetricAlongSlotsFromAllowed(
      allowed,
      count,
      minGap,
      loX,
      hiX,
    );
  } else if (entrance === "back") {
    const allowed = buildAllowedInteriorAlong(loX, hiX, forbiddenX);
    slotsBackX = symmetricAlongSlotsFromAllowed(
      allowed,
      count,
      minGap,
      loX,
      hiX,
    );
  } else if (entrance === "left") {
    const allowed = buildAllowedInteriorAlong(loZ, hiZ, forbiddenZ);
    slotsLeftZ = symmetricAlongSlotsFromAllowed(
      allowed,
      count,
      minGap,
      loZ,
      hiZ,
    );
  } else if (entrance === "right") {
    const allowed = buildAllowedInteriorAlong(loZ, hiZ, forbiddenZ);
    slotsRightZ = symmetricAlongSlotsFromAllowed(
      allowed,
      count,
      minGap,
      loZ,
      hiZ,
    );
  }

  if (placement === "front_only") {
    for (const lx of slotsFrontX) {
      set.add(colKey(lx, D - 1));
    }
    return set;
  }

  // symmetric: all four façades
  for (const lx of slotsFrontX) {
    set.add(colKey(lx, D - 1));
  }
  for (const lx of slotsBackX) {
    set.add(colKey(lx, 0));
  }
  for (const lz of slotsLeftZ) {
    set.add(colKey(0, lz));
  }
  for (const lz of slotsRightZ) {
    set.add(colKey(W - 1, lz));
  }
  return set;
}

/** First row of a vertical window run (avoids double-stacking on consecutive matching y). */
function isWindowColumnSeed(
  shouldPlaceWindowAt: (lx: number, lz: number, y: number) => boolean,
  lx: number,
  lz: number,
  y: number,
): boolean {
  if (!shouldPlaceWindowAt(lx, lz, y)) return false;
  if (y <= 1) return true;
  return !shouldPlaceWindowAt(lx, lz, y - 1);
}

function shellCell(
  r: ResolvedMedievalTower,
  W: number,
  D: number,
  T: number,
  lx: number,
  lz: number,
): boolean {
  if (!isExterior(lx, lz, W, D)) return false;
  if (r.massing.hollowInterior && inInteriorVoid(W, D, T, lx, lz)) return false;
  return true;
}

function buildWindowGlassSet(
  r: ResolvedMedievalTower,
  W: number,
  D: number,
  H: number,
  T: number,
  inDoorAperture: (lx: number, lz: number, y: number) => boolean,
  winH: number,
  shouldPlaceWindowAt: (lx: number, lz: number, y: number) => boolean,
): Set<string> {
  const glass = new Set<string>();
  for (let y = 1; y <= H; y++) {
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        if (!isWindowColumnSeed(shouldPlaceWindowAt, lx, lz, y)) continue;
        for (let dy = 0; dy < winH; dy++) {
          const yy = y + dy;
          if (yy > H) break;
          if (!windowFloorOk(yy, H, r.openings.windowsFloors)) break;
          if (inDoorAperture(lx, lz, yy)) break;
          if (isCorner(lx, lz, W, D)) break;
          if (r.massing.hollowInterior && inInteriorVoid(W, D, T, lx, lz)) break;
          if (!isExterior(lx, lz, W, D)) break;
          glass.add(lk(lx, yy, lz));
        }
      }
    }
  }
  return glass;
}

/**
 * `THREE.BoxGeometry` multi-material slot order used by `VoxelViewer`:
 * +X, -X, +Y (top), -Y (bottom), +Z, -Z.
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

  const windowColumnKeys = buildWindowColumnKeySet(
    r,
    W,
    D,
    elx0,
    elx1,
    elz0,
    elz1,
  );

  const shouldPlaceWindowAt = (lx: number, lz: number, y: number): boolean => {
    if (r.openings.windowsPlacement === "none") return false;
    if (r.openings.windowsCountPerSide <= 0) return false;
    if (!windowFloorOk(y, H, r.openings.windowsFloors)) return false;
    if (!isExterior(lx, lz, W, D) || isCorner(lx, lz, W, D)) return false;
    if (r.openings.windowsPlacement === "front_only" && lz !== D - 1) {
      return false;
    }
    if (inDoorAperture(lx, lz, y)) return false;
    return windowColumnKeys.has(colKey(lx, lz));
  };

  const winH = windowColumnHeight(r.openings.windowsStyle);
  const windowGlass = buildWindowGlassSet(
    r,
    W,
    D,
    H,
    T,
    inDoorAperture,
    winH,
    shouldPlaceWindowAt,
  );

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

        if (windowGlass.has(lk(lx, y, lz))) {
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

  for (const cell of windowGlass) {
    const parts = cell.split(",").map(Number);
    const lx = parts[0]!;
    const yy = parts[1]!;
    const lz = parts[2]!;
    if (
      yy > 1 &&
      shellCell(r, W, D, T, lx, lz) &&
      !inDoorAperture(lx, lz, yy - 1)
    ) {
      push(lx, yy - 1, lz, PRI.FACADE_TRIM, m.accent);
    }
    if (
      yy < H &&
      shellCell(r, W, D, T, lx, lz) &&
      !inDoorAperture(lx, lz, yy + 1)
    ) {
      push(lx, yy + 1, lz, PRI.FACADE_TRIM, m.accent);
    }
  }

  const side = r.openings.entranceSide;
  const portalYMax = Math.min(H, ehy + 1);

  if (side === "front" || side === "back") {
    const lz = side === "front" ? D - 1 : 0;
    if (elx0 >= 1) {
      for (let py = 1; py <= portalYMax; py++) {
        push(elx0 - 1, py, lz, PRI.PORTAL_ACCENT, m.accent);
      }
    }
    if (elx1 < W - 1) {
      for (let py = 1; py <= portalYMax; py++) {
        push(elx1 + 1, py, lz, PRI.PORTAL_ACCENT, m.accent);
      }
    }
    const lintelY = ehy + 1;
    if (lintelY <= H) {
      for (let lx = elx0; lx <= elx1; lx++) {
        push(lx, lintelY, lz, PRI.PORTAL_ACCENT, m.accent);
      }
    }
  } else {
    const lx = side === "right" ? W - 1 : 0;
    if (elz0 >= 1) {
      for (let py = 1; py <= portalYMax; py++) {
        push(lx, py, elz0 - 1, PRI.PORTAL_ACCENT, m.accent);
      }
    }
    if (elz1 < D - 1) {
      for (let py = 1; py <= portalYMax; py++) {
        push(lx, py, elz1 + 1, PRI.PORTAL_ACCENT, m.accent);
      }
    }
    const lintelY = ehy + 1;
    if (lintelY <= H) {
      for (let lz = elz0; lz <= elz1; lz++) {
        push(lx, lintelY, lz, PRI.PORTAL_ACCENT, m.accent);
      }
    }
  }

  const doorY0 = 1;
  if (side === "front" || side === "back") {
    const lz = side === "front" ? D - 1 : 0;
    for (let lx = elx0; lx <= elx1; lx++) {
      push(lx, doorY0, lz, PRI.DOOR, m.door);
    }
  } else {
    const lx = side === "right" ? W - 1 : 0;
    for (let lz = elz0; lz <= elz1; lz++) {
      push(lx, doorY0, lz, PRI.DOOR, m.door);
    }
  }

  if (r.openings.entranceStyle === "arched" && ehy >= 3) {
    const span =
      side === "front" || side === "back" ? elx1 - elx0 + 1 : elz1 - elz0 + 1;
    const mid =
      side === "front" || side === "back"
        ? Math.floor((elx0 + elx1) / 2)
        : Math.floor((elz0 + elz1) / 2);
    const archTop = Math.min(ehy, 3 + Math.floor(span / 2));
    for (let ay = 2; ay <= archTop; ay++) {
      const half = Math.min(ay - 1, Math.floor(span / 2));
      if (side === "front" || side === "back") {
        const lz = side === "front" ? D - 1 : 0;
        for (let dx = -half; dx <= half; dx++) {
          const lx = mid + dx;
          if (lx < elx0 || lx > elx1) continue;
          push(lx, ay, lz, PRI.ENTRANCE_ARCH, m.accent);
        }
      } else {
        const lx = side === "right" ? W - 1 : 0;
        for (let dz = -half; dz <= half; dz++) {
          const lz = mid + dz;
          if (lz < elz0 || lz > elz1) continue;
          push(lx, ay, lz, PRI.ENTRANCE_ARCH, m.accent);
        }
      }
    }
  }

  if (r.features.cornerPillars) {
    const corners: [number, number][] = [
      [0, 0],
      [W - 1, 0],
      [0, D - 1],
      [W - 1, D - 1],
    ];
    for (const [lx, lz] of corners) {
      push(lx, H + 1, lz, PRI.CORNER_CAPSTONE, m.accent);
    }
  }

  const roofBaseY = H + 1;
  const R = r.grid.roofLayers;
  const roofCells = new Set<string>();
  const colRoofTop = new Map<string, number>();

  const recordRoof = (wx: number, y: number, wz: number) => {
    roofCells.add(lk(wx, y, wz));
    const ck = colKey(wx, wz);
    const prev = colRoofTop.get(ck);
    colRoofTop.set(ck, prev === undefined ? y : Math.max(prev, y));
  };

  if (r.roof.style === "flat") {
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        push(lx, roofBaseY, lz, PRI.ROOF, m.roof);
        recordRoof(lx, roofBaseY, lz);
      }
    }
  } else {
    for (let layer = 0; layer < R; layer++) {
      const inset = layer;
      const rw = W - 2 * inset;
      const rd = D - 2 * inset;
      if (rw < 1 || rd < 1) break;
      const y = roofBaseY + layer;
      const isTopLayer = layer === R - 1;
      for (let lx = 0; lx < rw; lx++) {
        for (let lz = 0; lz < rd; lz++) {
          const wx = inset + lx;
          const wz = inset + lz;
          const isPer =
            lx === 0 || lx === rw - 1 || lz === 0 || lz === rd - 1;
          const supportedBelow = roofCells.has(lk(wx, y - 1, wz));
          if (isTopLayer) {
            if (!isPer && !supportedBelow) continue;
          } else if (!isPer) {
            continue;
          }
          push(wx, y, wz, PRI.ROOF, m.roof);
          recordRoof(wx, y, wz);
        }
      }
    }
  }

  if (r.features.crenellations) {
    const parapetKeys = new Set<string>();
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        if (!isExterior(lx, lz, W, D)) continue;
        const topY = colRoofTop.get(colKey(lx, lz));
        if (topY === undefined) continue;
        const yParapet = topY + 1;
        push(lx, yParapet, lz, PRI.PARAPET, m.accent);
        parapetKeys.add(lk(lx, yParapet, lz));
      }
    }
    for (let lx = 0; lx < W; lx++) {
      for (let lz = 0; lz < D; lz++) {
        if (!isExterior(lx, lz, W, D) || isCorner(lx, lz, W, D)) continue;
        const topY = colRoofTop.get(colKey(lx, lz));
        if (topY === undefined) continue;
        const yParapet = topY + 1;
        const yMerlon = yParapet + 1;
        if (!parapetKeys.has(lk(lx, yParapet, lz))) continue;
        if ((lx + lz + yMerlon) % 2 !== 0) continue;
        push(lx, yMerlon, lz, PRI.MERLON, m.accent);
      }
    }
  }

  let blocks = mergePlacements(pl);

  if (r.constraints.requireGroundedStructure || !r.constraints.allowFloatingBlocks) {
    blocks = filterGrounded(blocks, r.constraints.allowFloatingBlocks);
  }

  return blocks;
}
