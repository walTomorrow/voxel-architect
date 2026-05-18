import type { HorizontalPlacementV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { WindowLayoutV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { entranceSpanRange } from "@/src/lib/generation/components/geometry/facadeSides";

export function spanForHorizontalPlacement(
  interiorLo: number,
  interiorHi: number,
  width: number,
  horizontal: HorizontalPlacementV2["horizontal"],
): { spanLo: number; spanHi: number } {
  const spanLen = interiorHi - interiorLo + 1;
  const w = Math.min(width, spanLen);
  switch (horizontal) {
    case "left":
      return { spanLo: interiorLo, spanHi: interiorLo + w - 1 };
    case "right":
      return { spanHi: interiorHi, spanLo: interiorHi - w + 1 };
    case "center":
    default: {
      const { lo, hi } = entranceSpanRange(interiorLo, interiorHi, w);
      return { spanLo: lo, spanHi: hi };
    }
  }
}

/** Symmetric window slots (v1 parity). */
export function symmetricWindowSlots(
  lo: number,
  hi: number,
  want: number,
  minGap: number,
): number[] {
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

/** Evenly spaced slots along the allowed interior span. */
export function evenWindowSlots(
  lo: number,
  hi: number,
  want: number,
  minGap: number,
): number[] {
  if (want <= 0 || lo > hi) return [];
  if (want === 1) {
    const mid = Math.round((lo + hi) / 2);
    return [mid];
  }
  const picked: number[] = [];
  for (let i = 1; i <= want; i++) {
    const t = i / (want + 1);
    const p = Math.round(lo + t * (hi - lo));
    if (picked.every((q) => Math.abs(p - q) >= minGap)) {
      picked.push(p);
    }
  }
  picked.sort((a, b) => a - b);
  return picked.length === want ? picked : symmetricWindowSlots(lo, hi, want, minGap);
}

export function windowSlotsForLayout(
  allowedLo: number,
  allowedHi: number,
  count: number,
  layout: WindowLayoutV2,
  horizontal: HorizontalPlacementV2["horizontal"],
): number[] {
  if (count <= 0 || allowedLo > allowedHi) return [];
  const minGap = 2;
  const spanLen = allowedHi - allowedLo + 1;
  let lo = allowedLo;
  let hi = allowedHi;
  if (horizontal === "left") {
    hi = Math.min(allowedHi, allowedLo + Math.max(spanLen - 1, count * minGap));
  } else if (horizontal === "right") {
    lo = Math.max(allowedLo, allowedHi - Math.max(spanLen - 1, count * minGap));
  }
  return layout === "even"
    ? evenWindowSlots(lo, hi, count, minGap)
    : symmetricWindowSlots(lo, hi, count, minGap);
}

/** Place windows only on pre-filtered façade coordinates (e.g. excluding door span). */
export function pickWindowSlotsFromAllowed(
  allowed: readonly number[],
  count: number,
  layout: WindowLayoutV2,
  horizontal: HorizontalPlacementV2["horizontal"],
): number[] {
  if (count <= 0 || allowed.length === 0) return [];
  if (count >= allowed.length) return [...allowed.slice(0, count)];
  const lo = allowed[0]!;
  const hi = allowed[allowed.length - 1]!;
  const primary = windowSlotsForLayout(lo, hi, count, layout, horizontal).filter((v) =>
    allowed.includes(v),
  );
  if (primary.length >= count) return primary.slice(0, count);

  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(
      allowed.length - 1,
      Math.round(((i + 1) / (count + 1)) * (allowed.length - 1)),
    );
    const v = allowed[idx]!;
    if (picked.every((p) => Math.abs(p - v) >= 2)) picked.push(v);
  }
  return picked.slice(0, count);
}
