import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import type {
  BlueprintMaterialPalette,
  ComponentMaterialOverride,
} from "./types/materials";
import type { ResolvedMaterialPaletteV2 } from "@/src/lib/generation/components/v2/types";

function resolveMaterialKey(key: string, slot: string): BlockTypeId {
  if (!Object.prototype.hasOwnProperty.call(CLASSIC_BLOCK_PACK, key)) {
    throw new Error(`Unknown classic material key "${key}" for slot "${slot}".`);
  }
  return blockTypeId("classic", key);
}

/** Blueprint palette + optional per-component overrides → registry block ids. */
export function resolveMaterialPaletteV2(
  blueprint: BlueprintMaterialPalette,
  override?: ComponentMaterialOverride,
): ResolvedMaterialPaletteV2 {
  const pick = (slot: keyof BlueprintMaterialPalette) =>
    resolveMaterialKey(override?.[slot] ?? blueprint[slot], slot);
  return {
    wall: pick("wall"),
    floor: pick("floor"),
    roof: pick("roof"),
    window: pick("window"),
    door: pick("door"),
    accent: pick("accent"),
  };
}
