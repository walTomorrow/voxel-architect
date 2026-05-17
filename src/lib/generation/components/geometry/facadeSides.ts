import type { EntranceSide } from "@/src/lib/blueprints/types";

export function isOnFacadeSide(
  side: EntranceSide,
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

/** Interior span along the façade axis (excluding corners). */
export function facadeInteriorSpan(
  side: EntranceSide,
  W: number,
  D: number,
  T: number,
): { lo: number; hi: number; axis: "x" | "z" } {
  if (side === "front" || side === "back") {
    return { lo: T, hi: W - 1 - T, axis: "x" };
  }
  return { lo: T, hi: D - 1 - T, axis: "z" };
}

export function entranceSpanRange(
  spanLo: number,
  spanHi: number,
  width: number,
): { lo: number; hi: number } {
  const span = spanHi - spanLo + 1;
  const lo = spanLo + Math.max(0, Math.floor((span - width) / 2));
  const hi = lo + width - 1;
  return { lo, hi };
}

/** World offset one cell outside the façade along the outward normal. */
export function outsideCellOffset(
  side: EntranceSide,
): { dlx: number; dlz: number } {
  switch (side) {
    case "front":
      return { dlx: 0, dlz: 1 };
    case "back":
      return { dlx: 0, dlz: -1 };
    case "left":
      return { dlx: -1, dlz: 0 };
    case "right":
      return { dlx: 1, dlz: 0 };
    default:
      return { dlx: 0, dlz: 0 };
  }
}
