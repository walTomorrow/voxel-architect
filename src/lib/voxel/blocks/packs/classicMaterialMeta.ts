/**
 * Companion map for **`classic`** local keys — does **not** replace **`CLASSIC_BLOCK_PACK`**.
 * Only annotated entries unlock non-cube **`allowedShapeKinds`** via **`materialMetaHelpers`**.
 */

import type { MaterialMeta } from "../materialMetaTypes";

/**
 * Partial record: unlisted locals behave as **cube-only** for material/shape checks.
 */
export const CLASSIC_MATERIAL_META: Readonly<
  Partial<Record<string, MaterialMeta>>
> = {
  oak_planks: {
    materialFamily: "oak",
    materialGroup: "wood",
    textureRole: "planks",
    allowedShapeKinds: ["cube", "slab", "post"],
    tags: ["structural", "interior_trim"],
    minecraftCompatibility: {
      status: "approximate",
      notes: "VA planks ↔ MC oak planks (texture differs)",
    },
  },
  oak_log: {
    materialFamily: "oak",
    materialGroup: "wood",
    textureRole: "log",
    allowedShapeKinds: ["cube", "post"],
    tags: ["beam", "structural"],
    minecraftCompatibility: { status: "approximate", notes: "Axis/endgrain simplified" },
  },
  cobblestone: {
    materialFamily: "cobblestone",
    materialGroup: "stone_masonry",
    textureRole: "cobble",
    allowedShapeKinds: ["cube", "slab", "post"],
    tags: ["exterior_shell", "foundation"],
    minecraftCompatibility: { status: "approximate" },
  },
  limestone_bricks: {
    materialFamily: "limestone",
    materialGroup: "stone_masonry",
    textureRole: "brick",
    allowedShapeKinds: ["cube", "slab", "post"],
    tags: ["masonry", "accent"],
    minecraftCompatibility: { status: "approximate" },
  },
  glass: {
    materialFamily: "glass_clear",
    materialGroup: "glass",
    textureRole: "glass",
    allowedShapeKinds: ["cube", "pane"],
    tags: ["transparent", "window"],
    minecraftCompatibility: { status: "approximate", notes: "Uniform glass block / pane" },
  },
  slate_tiles: {
    materialFamily: "slate",
    materialGroup: "roof",
    textureRole: "tile",
    allowedShapeKinds: ["cube", "slab"],
    tags: ["roof"],
    minecraftCompatibility: { status: "unsupported", notes: "VA slate roofing vocabulary" },
  },
};
