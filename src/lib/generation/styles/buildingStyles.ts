/**
 * Building style catalog — metadata and authoring hints only.
 * Not consumed by generators or blueprint validation in this milestone slice.
 */

import type {
  BlueprintFeatures,
  BlueprintMaterials,
  BlueprintMassing,
  BlueprintOpenings,
  BlueprintRoof,
} from "@/src/lib/blueprints/types";
import type { VoxelBlockShapeKind } from "@/src/lib/voxel/types";

export type BuildingFamilyId = "medieval_tower";

/** Stable style vocabulary (may differ from curated preset ids). */
export const BUILDING_STYLE_IDS = [
  "rustic_stone_watchtower",
  "tall_military_watchtower",
  "fortified_gatehouse",
  "gothic_stone",
  "compact_guard_post",
  "dark_wizard",
] as const;

export type BuildingStyleId = (typeof BUILDING_STYLE_IDS)[number];

export type StyleMood = "bright" | "dark" | "austere" | "ornate";
export type StyleOrnamentation = "minimal" | "moderate" | "heavy";
export type StyleColorMood = "warm" | "cold" | "neutral";

/** Non-binding partial-shape preferences; generators may ignore until policy exists. */
export type EncouragedPartialShape = Extract<
  VoxelBlockShapeKind,
  "pane" | "slab" | "post"
>;

export interface BuildingStyleDefinition {
  readonly styleId: BuildingStyleId;
  readonly displayName: string;
  readonly description?: string;
  readonly applicableFamilies: readonly BuildingFamilyId[];
  readonly tags?: readonly string[];
  readonly defaultPalette: BlueprintMaterials;
  readonly massingHints?: Partial<
    Pick<BlueprintMassing, "verticalEmphasis" | "symmetry" | "wallThickness">
  >;
  readonly openingsHints?: Partial<
    Pick<
      BlueprintOpenings,
      | "entranceStyle"
      | "windowsStyle"
      | "windowsPlacement"
      | "windowsFloors"
      | "windowsCountPerSide"
    >
  >;
  readonly roofHints?: Partial<Pick<BlueprintRoof, "style">>;
  readonly featuresHints?: Partial<BlueprintFeatures>;
  readonly mood?: readonly StyleMood[];
  readonly ornamentation?: StyleOrnamentation;
  readonly colorMood?: StyleColorMood;
  readonly encouragedPartialShapes?: readonly EncouragedPartialShape[];
}

export const BUILDING_STYLES: Record<BuildingStyleId, BuildingStyleDefinition> = {
  rustic_stone_watchtower: {
    styleId: "rustic_stone_watchtower",
    displayName: "Rustic Stone Watchtower",
    description:
      "Balanced medieval watch — cobble and limestone with stepped slate crown and bilateral symmetry.",
    applicableFamilies: ["medieval_tower"],
    tags: ["medieval", "rustic", "stone_heavy", "watchtower"],
    defaultPalette: {
      wall: "cobblestone",
      floor: "limestone_bricks",
      roof: "slate_tiles",
      window: "glass",
      door: "oak_planks",
      accent: "limestone",
    },
    massingHints: {
      verticalEmphasis: "medium",
      symmetry: "bilateral",
      wallThickness: 2,
    },
    openingsHints: {
      entranceStyle: "arched",
      windowsStyle: "small",
      windowsPlacement: "symmetric",
      windowsFloors: "upper",
      windowsCountPerSide: 2,
    },
    roofHints: { style: "stepped_pyramid" },
    featuresHints: { crenellations: true, cornerPillars: true },
    mood: ["bright"],
    ornamentation: "moderate",
    colorMood: "neutral",
    encouragedPartialShapes: ["pane"],
  },

  tall_military_watchtower: {
    styleId: "tall_military_watchtower",
    displayName: "Tall Military Watchtower",
    description:
      "Slender high watch — thin shell, tall vertical emphasis, simple portal, stepped cap.",
    applicableFamilies: ["medieval_tower"],
    tags: ["medieval", "military", "watchtower", "slender"],
    defaultPalette: {
      wall: "cobblestone",
      floor: "limestone_bricks",
      roof: "slate_tiles",
      window: "glass",
      door: "oak_planks",
      accent: "mudstone",
    },
    massingHints: {
      verticalEmphasis: "tall",
      symmetry: "bilateral",
      wallThickness: 1,
    },
    openingsHints: {
      entranceStyle: "simple",
      windowsStyle: "small",
      windowsPlacement: "symmetric",
      windowsFloors: "upper",
      windowsCountPerSide: 2,
    },
    roofHints: { style: "stepped_pyramid" },
    featuresHints: { crenellations: true, cornerPillars: true },
    mood: ["austere"],
    ornamentation: "minimal",
    colorMood: "neutral",
    encouragedPartialShapes: ["pane"],
  },

  fortified_gatehouse: {
    styleId: "fortified_gatehouse",
    displayName: "Fortified Gatehouse",
    description:
      "Wide gatehouse mass — thick walls, mossy stone, broad arched entrance, flat roof cap.",
    applicableFamilies: ["medieval_tower"],
    tags: ["medieval", "fortress", "gatehouse", "stone_heavy"],
    defaultPalette: {
      wall: "mossy_cobblestone",
      floor: "limestone_bricks",
      roof: "slate_tiles",
      window: "glass",
      door: "oak_planks",
      accent: "limestone",
    },
    massingHints: {
      verticalEmphasis: "medium",
      symmetry: "bilateral",
      wallThickness: 3,
    },
    openingsHints: {
      entranceStyle: "arched",
      windowsStyle: "small",
      windowsPlacement: "symmetric",
      windowsFloors: "all",
      windowsCountPerSide: 2,
    },
    roofHints: { style: "flat" },
    featuresHints: { crenellations: true, cornerPillars: true },
    mood: ["austere"],
    ornamentation: "moderate",
    colorMood: "neutral",
    encouragedPartialShapes: ["pane"],
  },

  gothic_stone: {
    styleId: "gothic_stone",
    displayName: "Gothic Stone",
    description:
      "Pale limestone masonry with tall emphasis, arched openings, and stepped slate crown.",
    applicableFamilies: ["medieval_tower"],
    tags: ["gothic", "stone_heavy", "ecclesiastical", "tower"],
    defaultPalette: {
      wall: "limestone_bricks",
      floor: "limestone_bricks",
      roof: "slate_tiles",
      window: "glass",
      door: "oak_planks",
      accent: "limestone",
    },
    massingHints: {
      verticalEmphasis: "tall",
      symmetry: "bilateral",
      wallThickness: 2,
    },
    openingsHints: {
      entranceStyle: "arched",
      windowsStyle: "arched",
      windowsPlacement: "symmetric",
      windowsFloors: "upper",
      windowsCountPerSide: 2,
    },
    roofHints: { style: "stepped_pyramid" },
    featuresHints: { crenellations: true, cornerPillars: true },
    mood: ["bright", "ornate"],
    ornamentation: "moderate",
    colorMood: "warm",
    encouragedPartialShapes: ["pane"],
  },

  compact_guard_post: {
    styleId: "compact_guard_post",
    displayName: "Compact Guard Post",
    description:
      "Minimum border post — small footprint, narrow door, light front-facing windows.",
    applicableFamilies: ["medieval_tower"],
    tags: ["medieval", "military", "frontier", "compact"],
    defaultPalette: {
      wall: "cobblestone",
      floor: "gravel",
      roof: "slate",
      window: "glass",
      door: "oak_planks",
      accent: "andesite",
    },
    massingHints: {
      verticalEmphasis: "low",
      symmetry: "bilateral",
      wallThickness: 1,
    },
    openingsHints: {
      entranceStyle: "simple",
      windowsStyle: "small",
      windowsPlacement: "front_only",
      windowsFloors: "upper",
      windowsCountPerSide: 1,
    },
    roofHints: { style: "stepped_pyramid" },
    featuresHints: { crenellations: true, cornerPillars: false },
    mood: ["austere"],
    ornamentation: "minimal",
    colorMood: "cold",
    encouragedPartialShapes: ["pane"],
  },

  dark_wizard: {
    styleId: "dark_wizard",
    displayName: "Dark Wizard",
    description:
      "Moody obsidian shell with dense arched glazing and dark schist accents.",
    applicableFamilies: ["medieval_tower"],
    tags: ["fantasy", "dark", "wizard", "tower"],
    defaultPalette: {
      wall: "obsidian",
      floor: "schist",
      roof: "slate",
      window: "glass",
      door: "oak_planks",
      accent: "schist",
    },
    massingHints: {
      verticalEmphasis: "tall",
      symmetry: "bilateral",
      wallThickness: 2,
    },
    openingsHints: {
      entranceStyle: "arched",
      windowsStyle: "arched",
      windowsPlacement: "symmetric",
      windowsFloors: "all",
      windowsCountPerSide: 4,
    },
    roofHints: { style: "stepped_pyramid" },
    featuresHints: { crenellations: true, cornerPillars: true },
    mood: ["dark", "ornate"],
    ornamentation: "heavy",
    colorMood: "cold",
    encouragedPartialShapes: ["pane"],
  },
};

const ALL_STYLES: readonly BuildingStyleDefinition[] =
  Object.values(BUILDING_STYLES);

export function getBuildingStyle(
  styleId: string,
): BuildingStyleDefinition | undefined {
  if (!Object.prototype.hasOwnProperty.call(BUILDING_STYLES, styleId)) {
    return undefined;
  }
  return BUILDING_STYLES[styleId as BuildingStyleId];
}

export function stylesForFamily(
  familyId: BuildingFamilyId,
): readonly BuildingStyleDefinition[] {
  return ALL_STYLES.filter((s) => s.applicableFamilies.includes(familyId));
}

export function getAllBuildingStyles(): readonly BuildingStyleDefinition[] {
  return ALL_STYLES;
}
