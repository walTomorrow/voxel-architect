import { expect } from "vitest";

import type { VoxelStructureAnalysis } from "@/src/lib/voxel/structureAnalysis";
import type { VoxelBlock } from "@/src/lib/voxel/types";

export function formatGeneratorInvariantDiagnostics(ctx: {
  readonly id: string;
  readonly label: string;
  readonly blocksLen: number;
  readonly analysis: VoxelStructureAnalysis;
  readonly maxBlockCount: number;
}): string {
  const { id, label, blocksLen, analysis, maxBlockCount } = ctx;
  return [
    `[${id}] ${label}`,
    `blockCount=${blocksLen}`,
    `uniqueBlockCount=${analysis.uniqueBlockCount}`,
    `bounds=${JSON.stringify(analysis.bounds)}`,
    `invalidBlockTypeIds=${JSON.stringify(analysis.invalidBlockTypeIds)}`,
    `duplicateCoordinates=${JSON.stringify(analysis.duplicateCoordinates)}`,
    `connectedComponentCount26=${analysis.connectedComponentCount26}`,
    `ungroundedBlockCount26=${analysis.ungroundedBlockCount26}`,
    `maxBlockCount=${maxBlockCount}`,
  ].join(" | ");
}

/** Hard geometric invariants shared by preset and edge-case generator tests. */
export function assertGeneratedStructureHardInvariants(ctx: {
  readonly id: string;
  readonly label: string;
  readonly blocks: readonly VoxelBlock[];
  readonly analysis: VoxelStructureAnalysis;
  readonly maxBlockCount: number;
}): void {
  const { id, label, blocks, analysis, maxBlockCount } = ctx;
  const diag = formatGeneratorInvariantDiagnostics({
    id,
    label,
    blocksLen: blocks.length,
    analysis,
    maxBlockCount,
  });

  expect(blocks.length, diag).toBeGreaterThan(0);
  expect(
    analysis.blockCount,
    `expected analysis.blockCount === blocks.length (${diag})`,
  ).toBe(blocks.length);
  expect(analysis.uniqueBlockCount, diag).toBeGreaterThan(0);
  expect(
    analysis.invalidBlockTypeIds.length,
    `invalid block IDs: ${JSON.stringify(analysis.invalidBlockTypeIds)} (${diag})`,
  ).toBe(0);
  expect(
    analysis.duplicateCoordinateCount,
    `duplicateCoordinateCount !== 0 (${diag})`,
  ).toBe(0);
  expect(
    analysis.connectedComponentCount26,
    `expected single 26-neighbor component (${diag})`,
  ).toBe(1);
  expect(
    analysis.ungroundedBlockCount26,
    `expected all cells grounded from y===minY (${diag})`,
  ).toBe(0);
  expect(analysis.allBlocksGroundedConnected26, diag).toBe(true);
  expect(
    blocks.length,
    `block count exceeds maxBlockCount (${diag})`,
  ).toBeLessThanOrEqual(maxBlockCount);
}
