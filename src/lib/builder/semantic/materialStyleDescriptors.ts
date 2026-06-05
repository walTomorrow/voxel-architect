import type { BlueprintMaterialPalette } from "@/src/lib/blueprints/types/materials";

/** Style tags for classic material keys used in v2 palette slots. */
export const MATERIAL_STYLE_DESCRIPTORS: Readonly<Record<string, readonly string[]>> = {
  andesite: ["cool", "gray", "modern"],
  beech_planks: ["warm", "light wood", "wooden"],
  beech_leaves: ["natural", "organic"],
  cobblestone: ["sturdy", "medieval", "rustic", "heavy", "gray"],
  eucalyptus_planks: ["warm", "wooden"],
  glass: ["bright", "open", "transparent"],
  grass_block: ["earthy", "natural"],
  limestone: ["pale", "clean", "accent"],
  limestone_bricks: ["bright", "clean", "refined", "pale", "formal"],
  mud: ["earthy", "informal"],
  oak_planks: ["warm", "wooden", "rustic", "cozy"],
  slate_tiles: ["dark", "formal", "roof-like", "medieval"],
};

const UNKNOWN_MATERIAL_TAGS = ["neutral"] as const;

export function getMaterialStyleTags(materialKey: string): readonly string[] {
  return MATERIAL_STYLE_DESCRIPTORS[materialKey] ?? UNKNOWN_MATERIAL_TAGS;
}

export function aggregatePaletteStyleDescriptors(
  materials: BlueprintMaterialPalette,
): readonly string[] {
  const tags = new Set<string>();
  for (const value of Object.values(materials)) {
    if (value == null) continue;
    for (const tag of getMaterialStyleTags(String(value))) {
      tags.add(tag);
    }
  }
  return [...tags];
}

export function describePaletteMaterials(materials: BlueprintMaterialPalette): string {
  const parts: string[] = [];
  for (const [slot, value] of Object.entries(materials)) {
    if (value != null) parts.push(`${slot}=${value}`);
  }
  return parts.join(", ");
}
