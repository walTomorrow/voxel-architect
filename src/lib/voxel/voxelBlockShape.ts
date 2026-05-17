/**
 * Pure helpers for partial-block shapeKind / state normalization and validation.
 * Occupancy and duplicate detection remain keyed by x/y/z only.
 */

import type {
  VoxelBlock,
  VoxelBlockShapeKind,
  VoxelBlockState,
} from "./types";

export interface VoxelBlockShapeValidationOk {
  readonly ok: true;
}

export interface VoxelBlockShapeValidationErr {
  readonly ok: false;
  readonly errors: readonly string[];
}

export type VoxelBlockShapeValidation =
  | VoxelBlockShapeValidationOk
  | VoxelBlockShapeValidationErr;

/** Resolved shape for rendering / batching (first slice only). */
export type VoxelRenderVariant =
  | { readonly kind: "cube" }
  | { readonly kind: "slab"; readonly half: "top" | "bottom" }
  | { readonly kind: "pane"; readonly axis: "x" | "z" }
  | { readonly kind: "post" };

/** Omitted or explicit `"cube"` → `"cube"`. */
export function normalizeVoxelBlockShapeKind(
  block: VoxelBlock,
): VoxelBlockShapeKind {
  return block.shapeKind ?? "cube";
}

/**
 * Strip irrelevant state for the normalized shape (for display logic only).
 */
export function normalizeVoxelBlockState(block: VoxelBlock): VoxelBlockState | undefined {
  const shape = normalizeVoxelBlockShapeKind(block);
  const s = block.state;
  if (!s) return undefined;
  if (shape === "slab") {
    return s.half != null ? { half: s.half } : undefined;
  }
  if (shape === "pane") {
    return s.axis != null ? { axis: s.axis } : undefined;
  }
  return undefined;
}

export function validateVoxelBlockShapeState(block: VoxelBlock): VoxelBlockShapeValidation {
  const raw = (block.shapeKind ?? "cube") as string;
  if (
    raw !== "cube" &&
    raw !== "slab" &&
    raw !== "pane" &&
    raw !== "post"
  ) {
    return {
      ok: false,
      errors: [`Unknown shapeKind: ${raw}`],
    };
  }
  const shape = raw as VoxelBlockShapeKind;
  const st = block.state;

  if (shape === "cube") {
    if (st?.half != null || st?.axis != null) {
      return {
        ok: false,
        errors: ["cube must not set state.half or state.axis"],
      };
    }
    return { ok: true };
  }

  if (shape === "slab") {
    if (st?.half !== "top" && st?.half !== "bottom") {
      return {
        ok: false,
        errors: ['slab requires state.half to be "top" or "bottom"'],
      };
    }
    if (st?.axis != null) {
      return { ok: false, errors: ["slab must not set state.axis"] };
    }
    return { ok: true };
  }

  if (shape === "pane") {
    if (st?.axis !== "x" && st?.axis !== "z") {
      return {
        ok: false,
        errors: ['pane requires state.axis to be "x" or "z"'],
      };
    }
    if (st?.half != null) {
      return { ok: false, errors: ["pane must not set state.half"] };
    }
    return { ok: true };
  }

  /* post */
  if (st?.half != null || st?.axis != null) {
    return {
      ok: false,
      errors: ["post must not set state.half or state.axis"],
    };
  }
  return { ok: true };
}

/** Returns render variant when valid; otherwise `null`. */
export function getVoxelBlockRenderVariant(block: VoxelBlock): VoxelRenderVariant | null {
  if (!validateVoxelBlockShapeState(block).ok) return null;
  const shape = normalizeVoxelBlockShapeKind(block);
  switch (shape) {
    case "cube":
      return { kind: "cube" };
    case "slab":
      return { kind: "slab", half: block.state!.half! };
    case "pane":
      return { kind: "pane", axis: block.state!.axis! };
    case "post":
      return { kind: "post" };
    default:
      return null;
  }
}

/** Stable key for renderer batching: same materials + same variant dimensions. */
export function getVoxelBlockRenderBucketKey(block: VoxelBlock): string | null {
  const variant = getVoxelBlockRenderVariant(block);
  if (!variant) return null;
  const id = block.blockTypeId;
  switch (variant.kind) {
    case "cube":
      return `${id}|cube`;
    case "slab":
      return `${id}|slab|${variant.half}`;
    case "pane":
      return `${id}|pane|${variant.axis}`;
    case "post":
      return `${id}|post`;
    default: {
      const _exhaust: never = variant;
      return _exhaust;
    }
  }
}
