import type {
  BlockPackDefinitions,
  BlockPackId,
  BlockTypeDefinition,
  BlockTypeId,
} from "./registry-types";
import { CLASSIC_BLOCK_PACK } from "./packs/classic";
import {
  collectFilenamesFromFaces,
  textureUrl,
} from "./textureUrls";

const packs = new Map<BlockPackId, BlockPackDefinitions>();

packs.set("classic", CLASSIC_BLOCK_PACK);

/**
 * Register or replace a texture pack. Future packs (e.g. `retro`, `hd`) call
 * this from a module side-effect or app bootstrap.
 */
export function registerBlockTexturePack(
  packId: BlockPackId,
  definitions: BlockPackDefinitions,
): void {
  packs.set(packId, definitions);
}

export function getBlockDefinition(
  blockTypeId: BlockTypeId,
): BlockTypeDefinition | undefined {
  const slash = blockTypeId.indexOf("/");
  if (slash <= 0) return undefined;
  const packId = blockTypeId.slice(0, slash) as BlockPackId;
  const localId = blockTypeId.slice(slash + 1);
  return packs.get(packId)?.[localId];
}

export function blockTypeId(packId: string, localId: string): BlockTypeId {
  return `${packId}/${localId}` as BlockTypeId;
}

export function collectTextureUrlsForBlockTypes(
  blockTypeIds: Iterable<string>,
): string[] {
  const out = new Set<string>();
  for (const id of blockTypeIds) {
    const def = getBlockDefinition(id as BlockTypeId);
    if (!def) continue;
    const slash = id.indexOf("/");
    const packId = slash > 0 ? id.slice(0, slash) : "classic";
    for (const file of collectFilenamesFromFaces(def.faces)) {
      out.add(textureUrl(packId, file));
    }
  }
  return [...out].sort();
}

export function isTransparentBlock(def: BlockTypeDefinition): boolean {
  return Boolean(def.transparent || def.alphaTest != null);
}

export function sortBlockTypesForRender(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const da = getBlockDefinition(a as BlockTypeId);
    const db = getBlockDefinition(b as BlockTypeId);
    const ta = da ? (isTransparentBlock(da) ? 1 : 0) : 0;
    const tb = db ? (isTransparentBlock(db) ? 1 : 0) : 0;
    return ta - tb;
  });
}
