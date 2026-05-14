import type { BlockPackDefinitions } from "../registry-types";

/**
 * Classic texture pack — filenames match `public/textures/classic/*.png`.
 * Bottom of grass uses `mud.png` as a dirt-like underside (no dedicated dirt texture).
 */
export const CLASSIC_BLOCK_PACK: BlockPackDefinitions = {
  andesite: { faces: { kind: "uniform", file: "andesite.png" } },
  beech_leaves: {
    faces: { kind: "uniform", file: "beech_leaves.png" },
    transparent: true,
    alphaTest: 0.35,
    depthWrite: false,
  },
  beech_log: {
    faces: {
      kind: "topSideBottom",
      top: "beech_log_top.png",
      side: "beech_log_side.png",
      bottom: "beech_log_top.png",
    },
  },
  beech_planks: { faces: { kind: "uniform", file: "beech_planks.png" } },
  cobblestone: { faces: { kind: "uniform", file: "cobblestone.png" } },
  eucalyptus_leaves: {
    faces: { kind: "uniform", file: "eucalyptus_leaves.png" },
    transparent: true,
    alphaTest: 0.35,
    depthWrite: false,
  },
  eucalyptus_log: {
    faces: {
      kind: "topSideBottom",
      top: "eucalyptus_log_top.png",
      side: "eucalyptus_log_side.png",
      bottom: "eucalyptus_log_top.png",
    },
  },
  eucalyptus_planks: { faces: { kind: "uniform", file: "eucalyptus_planks.png" } },
  glass: {
    faces: { kind: "uniform", file: "glass.png" },
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    metalness: 0.2,
    roughness: 0.15,
  },
  grass: {
    faces: {
      kind: "topSideBottom",
      top: "grass_top.png",
      side: "grass_side.png",
      bottom: "mud.png",
    },
  },
  grass_snowy: {
    faces: {
      kind: "topSideBottom",
      top: "grass_top.png",
      side: "grass_snowy_side.png",
      bottom: "snow.png",
    },
  },
  gravel: { faces: { kind: "uniform", file: "gravel.png" } },
  layer_rock: { faces: { kind: "uniform", file: "layer_rock.png" } },
  limestone: { faces: { kind: "uniform", file: "limestone.png" } },
  limestone_bricks: { faces: { kind: "uniform", file: "limestone_bricks.png" } },
  maple_leaves: {
    faces: { kind: "uniform", file: "maple_leaves.png" },
    transparent: true,
    alphaTest: 0.35,
    depthWrite: false,
  },
  maple_log: {
    faces: {
      kind: "topSideBottom",
      top: "maple_log_top.png",
      side: "maple_log_side.png",
      bottom: "maple_log_top.png",
    },
  },
  maple_planks: { faces: { kind: "uniform", file: "maple_planks.png" } },
  mossy_cobblestone: { faces: { kind: "uniform", file: "mossy_cobblestone.png" } },
  mud: { faces: { kind: "uniform", file: "mud.png" } },
  mud_bricks: { faces: { kind: "uniform", file: "mud_bricks.png" } },
  mud_cracked: { faces: { kind: "uniform", file: "mud_cracked.png" } },
  mudstone: { faces: { kind: "uniform", file: "mudstone.png" } },
  oak_leaves: {
    faces: { kind: "uniform", file: "oak_leaves.png" },
    transparent: true,
    alphaTest: 0.35,
    depthWrite: false,
  },
  oak_log: {
    faces: {
      kind: "topSideBottom",
      top: "oak_log_top.png",
      side: "oak_log_side.png",
      bottom: "oak_log_top.png",
    },
  },
  oak_planks: { faces: { kind: "uniform", file: "oak_planks.png" } },
  obsidian: {
    faces: { kind: "uniform", file: "obsidian.png" },
    metalness: 0.05,
    roughness: 0.35,
  },
  old_clay: { faces: { kind: "uniform", file: "old_clay.png" } },
  pine_leaves: {
    faces: { kind: "uniform", file: "pine_leaves.png" },
    transparent: true,
    alphaTest: 0.35,
    depthWrite: false,
  },
  pine_log: {
    faces: {
      kind: "topSideBottom",
      top: "pine_log_top.png",
      side: "pine_log_side.png",
      bottom: "pine_log_top.png",
    },
  },
  pine_planks: { faces: { kind: "uniform", file: "pine_planks.png" } },
  schist: { faces: { kind: "uniform", file: "schist.png" } },
  slate: { faces: { kind: "uniform", file: "slate.png" } },
  slate_tiles: { faces: { kind: "uniform", file: "slate_tiles.png" } },
  snow: { faces: { kind: "uniform", file: "snow.png" } },
} as const satisfies BlockPackDefinitions;
