/**
 * Companion metadata for block definitions — intentionally partial.
 * Missing rows ⇒ generators/view logic treat **`cube`** as the only allowed shape
 * (plus omitted **`shapeKind`** defaulting to cube per **`normalizeVoxelBlockShapeKind`**).
 * Future custom VA-only families and Minecraft export wiring are deferred.
 */

import type { VoxelBlockShapeKind } from "../types";

/** Broad Minecraft-inspired buckets for architecture tooling (expand sparingly). */
export type MaterialGroup =
  | "wood"
  | "stone_masonry"
  | "glass"
  | "metal_utility"
  | "organic"
  | "roof"
  | "light"
  | "decorative"
  | "terrain"
  | "special";

/** How the texture set is used; not the placed **`shapeKind`** (that stays on **`VoxelBlock`**). */
export type TextureRole =
  | "log"
  | "planks"
  | "leaves"
  | "cobble"
  | "brick"
  | "raw"
  | "tile"
  | "glass"
  | "grass"
  | "mud"
  | "special";

/** Reserved for future Minecraft-oriented export (not implemented yet). */
export type MinecraftCompatibilityStatus =
  | "exact"
  | "approximate"
  | "composed"
  | "unsupported";

export interface MinecraftCompatibility {
  readonly status: MinecraftCompatibilityStatus;
  readonly notes?: string;
}

export interface MaterialMeta {
  readonly materialFamily: string;
  readonly materialGroup: MaterialGroup;
  readonly textureRole: TextureRole;
  /** Placement shapes permitted for this material row (`cube` almost always listed when annotated). */
  readonly allowedShapeKinds: readonly VoxelBlockShapeKind[];
  readonly tags?: readonly string[];
  readonly minecraftCompatibility?: MinecraftCompatibility;
}
