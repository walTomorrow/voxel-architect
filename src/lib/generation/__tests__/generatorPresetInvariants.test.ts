import { describe, expect, it } from "vitest";
import {
  MEDIEVAL_TOWER_PRESETS,
  type MedievalTowerPreset,
} from "@/src/lib/blueprints/sampleBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import {
  analyzeVoxelStructure,
  type VoxelStructureAnalysis,
} from "@/src/lib/voxel/structureAnalysis";

function invariantContext(
  preset: MedievalTowerPreset,
  blocksLen: number,
  analysis: VoxelStructureAnalysis,
  maxBlockCount: number,
): string {
  return [
    `[${preset.id}] ${preset.label}`,
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

describe("generator preset invariants (curated medieval towers)", () => {
  it.each(MEDIEVAL_TOWER_PRESETS)(
    "preset $id: validates, generates, and passes structural invariants",
    (preset) => {
      const blueprint = structuredClone(preset.blueprint);
      const validation = validateBlueprint(blueprint);

      expect(
        validation.ok,
        `[${preset.id}] ${preset.label}: validation failed — errors=${JSON.stringify(validation.errors)}`,
      ).toBe(true);
      expect(
        validation.resolved,
        `[${preset.id}] ${preset.label}: validateBlueprint ok but missing resolved`,
      ).toBeDefined();

      const resolved = validation.resolved!;
      const maxBlockCount = resolved.constraints.maxBlockCount;

      const blocks = generateStructureFromResolved(resolved);
      const analysis = analyzeVoxelStructure(blocks);
      const diag = invariantContext(preset, blocks.length, analysis, maxBlockCount);

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
    },
  );
});
