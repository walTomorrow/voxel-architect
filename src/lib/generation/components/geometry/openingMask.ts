import type {
  EntranceSide,
  GenericWindowMode,
  ResolvedGenericBuilding,
} from "@/src/lib/blueprints/types";
import { entranceSpanRange, facadeInteriorSpan } from "./facadeSides";
import { localApertureKey } from "./localKeys";

export type DerivedOpenings = {
  readonly shellSkipMask: ReadonlySet<string>;
  readonly windowMask: ReadonlySet<string>;
  readonly entranceMask: ReadonlySet<string>;
};

function symmetricSlots(lo: number, hi: number, want: number, minGap: number): number[] {
  if (want <= 0 || lo > hi) return [];
  const center = (lo + hi) / 2;
  const picked: number[] = [];
  const ok = (p: number) =>
    p >= lo && p <= hi && picked.every((q) => Math.abs(p - q) >= minGap);

  if (want % 2 === 1) {
    const mid = Math.max(lo, Math.min(hi, Math.round(center)));
    if (!ok(mid)) return [];
    picked.push(mid);
  }
  let d = 1;
  while (picked.length < want) {
    const L = Math.ceil(center - d);
    const R = Math.floor(center + d);
    if (L < lo && R > hi) break;
    if (L >= lo && R <= hi && ok(L) && ok(R) && R - L >= minGap) {
      picked.push(L, R);
      d++;
      continue;
    }
    d++;
    if (d > hi - lo + 8) break;
  }
  picked.sort((a, b) => a - b);
  return picked.length === want ? picked : picked.slice(0, want);
}

function windowYFromBand(
  resolved: ResolvedGenericBuilding,
): number {
  const bodyLayers = resolved.grid.bodyLayers;
  const band = resolved.openings.windows.heightBand ?? "auto";
  switch (band) {
    case "upper":
      return Math.min(bodyLayers, Math.max(2, bodyLayers));
    case "mid":
      return Math.max(2, Math.floor(bodyLayers / 2));
    case "auto":
    default:
      return Math.max(2, Math.floor(bodyLayers / 2));
  }
}

function addEntranceMask(
  mask: Set<string>,
  resolved: ResolvedGenericBuilding,
): void {
  const { entrance } = resolved.openings;
  const W = resolved.grid.width;
  const D = resolved.grid.depth;
  const T = resolved.body.wallThickness;
  const { lo: spanLo, hi: spanHi } = facadeInteriorSpan(
    entrance.side,
    W,
    D,
    T,
  );
  const { lo, hi } = entranceSpanRange(spanLo, spanHi, entrance.width);
  // y=0 keeps foundation/floor in the doorway; wall opening is y=1..height.
  for (let y = 1; y <= entrance.height; y++) {
    if (entrance.side === "front") {
      for (let lx = lo; lx <= hi; lx++) {
        mask.add(localApertureKey(lx, y, D - 1));
      }
    } else if (entrance.side === "back") {
      for (let lx = lo; lx <= hi; lx++) {
        mask.add(localApertureKey(lx, y, 0));
      }
    } else if (entrance.side === "left") {
      for (let lz = lo; lz <= hi; lz++) {
        mask.add(localApertureKey(0, y, lz));
      }
    } else {
      for (let lz = lo; lz <= hi; lz++) {
        mask.add(localApertureKey(W - 1, y, lz));
      }
    }
  }
}

function facadesForMode(mode: GenericWindowMode): EntranceSide[] {
  switch (mode) {
    case "front_only":
      return ["front"];
    case "front_and_sides":
      return ["front", "left", "right"];
    case "all_sides":
      return ["front", "back", "left", "right"];
    case "none":
    default:
      return [];
  }
}

function addWindowsForFacade(
  windowMask: Set<string>,
  shellSkip: Set<string>,
  side: EntranceSide,
  resolved: ResolvedGenericBuilding,
  countOnFacade: number,
  wy: number,
  forbiddenAlong: ReadonlySet<number>,
): void {
  const W = resolved.grid.width;
  const D = resolved.grid.depth;
  const T = resolved.body.wallThickness;
  const { lo, hi, axis } = facadeInteriorSpan(side, W, D, T);
  const allowed: number[] = [];
  for (let v = lo; v <= hi; v++) {
    if (!forbiddenAlong.has(v)) allowed.push(v);
  }
  if (allowed.length === 0 || countOnFacade <= 0) return;

  const minGap = 2;
  const loA = allowed[0]!;
  const hiA = allowed[allowed.length - 1]!;
  const slots = symmetricSlots(loA, hiA, countOnFacade, minGap).filter((v) =>
    allowed.includes(v),
  );

  for (const v of slots) {
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
}

function forbiddenAlongEntrance(resolved: ResolvedGenericBuilding): Map<EntranceSide, Set<number>> {
  const map = new Map<EntranceSide, Set<number>>();
  const { entrance } = resolved.openings;
  const W = resolved.grid.width;
  const D = resolved.grid.depth;
  const T = resolved.body.wallThickness;
  const { lo: spanLo, hi: spanHi } = facadeInteriorSpan(
    entrance.side,
    W,
    D,
    T,
  );
  const { lo, hi } = entranceSpanRange(spanLo, spanHi, entrance.width);
  const forbidden = new Set<number>();
  for (let v = lo; v <= hi; v++) forbidden.add(v);
  map.set(entrance.side, forbidden);
  return map;
}

export function deriveOpeningsForGenericBuilding(
  resolved: ResolvedGenericBuilding,
): DerivedOpenings {
  const shellSkipMask = new Set<string>();
  const windowMask = new Set<string>();
  const entranceMask = new Set<string>();

  addEntranceMask(entranceMask, resolved);
  for (const k of entranceMask) shellSkipMask.add(k);

  const win = resolved.openings.windows;
  if (win.mode === "none" || win.count <= 0) {
    return { shellSkipMask, windowMask, entranceMask };
  }

  const facades = facadesForMode(win.mode);
  const entranceForbidden = forbiddenAlongEntrance(resolved);
  const wy = windowYFromBand(resolved);
  const perFacade = Math.max(1, Math.floor(win.count / facades.length));
  let remainder = win.count - perFacade * facades.length;

  for (const side of facades) {
    const n = perFacade + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const forbidden = entranceForbidden.get(side) ?? new Set<number>();
    addWindowsForFacade(
      windowMask,
      shellSkipMask,
      side,
      resolved,
      n,
      wy,
      forbidden,
    );
  }

  return { shellSkipMask, windowMask, entranceMask };
}

export function isExteriorCell(
  lx: number,
  lz: number,
  W: number,
  D: number,
): boolean {
  return lx === 0 || lx === W - 1 || lz === 0 || lz === D - 1;
}

export function isCornerCell(lx: number, lz: number, W: number, D: number): boolean {
  return (
    (lx === 0 || lx === W - 1) && (lz === 0 || lz === D - 1)
  );
}
