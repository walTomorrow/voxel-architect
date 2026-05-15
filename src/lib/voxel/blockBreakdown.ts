import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import { getBlockDefinition } from "@/src/lib/voxel/blocks/registry";
import type { VoxelBlock } from "@/src/lib/voxel/types";

export type FullStructureBreakdownRow = {
  readonly blockTypeId: BlockTypeId;
  /** Short lab label; full `blockTypeId` if unknown to the registry. */
  readonly label: string;
  readonly count: number;
};

/**
 * Human-ish label from `pack/local_key` — registry has no displayName field.
 * Unknown ids fall back to the full `blockTypeId` string.
 */
export function displayLabelForBlockTypeId(id: BlockTypeId): string {
  if (!getBlockDefinition(id)) return id;
  const slash = id.indexOf("/");
  const local = slash > 0 ? id.slice(slash + 1) : id;
  return local.replace(/_/g, " ");
}

/**
 * Inventory of the **full** generated structure: counts by `blockTypeId` only.
 * Omits types with zero count (output list never includes zeros).
 * Sort: descending `count`, then `blockTypeId` ascending (stable lab order).
 */
export function fullStructureBlockBreakdown(
  blocks: readonly VoxelBlock[],
): readonly FullStructureBreakdownRow[] {
  if (blocks.length === 0) return [];
  const counts = new Map<string, number>();
  for (const b of blocks) {
    const id = b.blockTypeId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const rows: FullStructureBreakdownRow[] = [];
  for (const [blockTypeId, count] of counts) {
    if (count <= 0) continue;
    const id = blockTypeId as BlockTypeId;
    rows.push({
      blockTypeId: id,
      label: displayLabelForBlockTypeId(id),
      count,
    });
  }
  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.blockTypeId.localeCompare(b.blockTypeId);
  });
  return rows;
}
