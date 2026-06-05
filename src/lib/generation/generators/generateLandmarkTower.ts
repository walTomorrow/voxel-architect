import { blockTypeId } from "@/src/lib/voxel/blocks/registry";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type { LandmarkTowerBlueprint, TowerFootprintShape } from "@/src/lib/blueprints/types/landmarkTower";
import {
  centerOrigin,
  filterGroundedConnected26,
  mergePlacements,
  type GeneratorPlacement,
} from "@/src/lib/generation/placement/placementUtils";
import type { VoxelBlock } from "@/src/lib/voxel/types";

const PRI = {
  BASE: 10,
  WALL: 20,
  WINDOW: 25,
  CROWN: 30,
  ACCENT: 15,
} as const;

function resolveMat(key: string): BlockTypeId {
  return blockTypeId("classic", key);
}

function inFootprint(
  lx: number,
  lz: number,
  w: number,
  d: number,
  shape: TowerFootprintShape,
): boolean {
  if (shape === "square") return true;
  const corner =
    (lx < 1 && lz < 1) ||
    (lx < 1 && lz >= d - 1) ||
    (lx >= w - 1 && lz < 1) ||
    (lx >= w - 1 && lz >= d - 1);
  if (shape === "octagonal") return !corner;
  // circular_approx: cut corners + shallow edge trims
  if (corner) return false;
  const edge =
    (lx < 1 && (lz === 1 || lz === d - 2)) ||
    (lz < 1 && (lx === 1 || lx === w - 2)) ||
    (lx >= w - 1 && (lz === 1 || lz === d - 2)) ||
    (lz >= d - 1 && (lx === 1 || lx === w - 2));
  return !edge;
}

function isPerimeter(lx: number, lz: number, w: number, d: number): boolean {
  return lx === 0 || lz === 0 || lx === w - 1 || lz === d - 1;
}

type Face = "front" | "back" | "left" | "right";

function faceCells(
  face: Face,
  w: number,
  d: number,
): readonly { readonly lx: number; readonly lz: number }[] {
  const cells: { lx: number; lz: number }[] = [];
  if (face === "front") {
    for (let lx = 0; lx < w; lx++) cells.push({ lx, lz: d - 1 });
  } else if (face === "back") {
    for (let lx = 0; lx < w; lx++) cells.push({ lx, lz: 0 });
  } else if (face === "left") {
    for (let lz = 0; lz < d; lz++) cells.push({ lx: 0, lz });
  } else {
    for (let lz = 0; lz < d; lz++) cells.push({ lx: w - 1, lz });
  }
  return cells;
}

function pickWindowCells(
  face: Face,
  w: number,
  d: number,
  count: number,
  shape: TowerFootprintShape,
): { lx: number; lz: number }[] {
  const candidates = faceCells(face, w, d).filter((c) =>
    inFootprint(c.lx, c.lz, w, d, shape),
  );
  if (candidates.length === 0) return [];
  if (count >= candidates.length) return [...candidates];
  const out: { lx: number; lz: number }[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(((i + 0.5) * candidates.length) / count);
    out.push(candidates[idx]!);
  }
  return out;
}

function windowBlock(
  treatment: LandmarkTowerBlueprint["tower"]["windowTreatment"],
  windowMat: BlockTypeId,
): BlockTypeId | null {
  if (treatment === "open") return null;
  return windowMat;
}

export function generateLandmarkTower(blueprint: LandmarkTowerBlueprint): VoxelBlock[] {
  const { tower: t, materials, constraints } = blueprint;
  const wall = resolveMat(materials.wall);
  const cap = resolveMat(materials.cap);
  const baseMat = resolveMat(materials.base);
  const accent = resolveMat(materials.accent);
  const windowMat = resolveMat(materials.window);

  const shaftW = t.footprintWidth;
  const shaftD = t.footprintDepth;
  const baseW = shaftW + t.basePad * 2;
  const baseD = shaftD + t.basePad * 2;

  const shaftOriginX = centerOrigin(shaftW);
  const shaftOriginZ = centerOrigin(shaftD);
  const baseOriginX = centerOrigin(baseW);
  const baseOriginZ = centerOrigin(baseD);

  const placements: GeneratorPlacement[] = [];
  let idx = 0;

  const shaftBaseY = t.baseHeight;
  const crownBaseY = shaftBaseY + t.shaftHeight;

  const windowSlots = new Set<string>();
  const faces: Face[] = ["front", "back", "left", "right"];
  for (const face of faces) {
    const rowYs: number[] = [];
    for (let r = 0; r < t.windowRows; r++) {
      const frac = (r + 1) / (t.windowRows + 1);
      rowYs.push(shaftBaseY + Math.max(1, Math.floor(frac * t.shaftHeight)));
    }
    for (const y of rowYs) {
      const cells = pickWindowCells(face, shaftW, shaftD, t.windowsPerRow, t.footprintShape);
      for (const c of cells) {
        windowSlots.add(`${c.lx},${y},${c.lz}`);
      }
    }
  }

  // Entrance at base front
  if (t.entrance) {
    const midX = Math.floor(shaftW / 2);
    for (let dy = 0; dy < 2 && shaftBaseY - dy >= 1; dy++) {
      windowSlots.add(`${midX},${shaftBaseY - dy},${shaftD - 1}`);
      if (midX + 1 < shaftW) {
        windowSlots.add(`${midX + 1},${shaftBaseY - dy},${shaftD - 1}`);
      }
    }
  }

  // Base plinth
  for (let y = 0; y < t.baseHeight; y++) {
    for (let lx = 0; lx < baseW; lx++) {
      for (let lz = 0; lz < baseD; lz++) {
        if (!inFootprint(lx, lz, baseW, baseD, t.footprintShape)) continue;
        placements.push({
          x: baseOriginX + lx,
          y,
          z: baseOriginZ + lz,
          p: PRI.BASE,
          id: baseMat,
          i: idx++,
        });
      }
    }
  }

  // Shaft shell
  for (let y = shaftBaseY; y < crownBaseY; y++) {
    for (let lx = 0; lx < shaftW; lx++) {
      for (let lz = 0; lz < shaftD; lz++) {
        if (!inFootprint(lx, lz, shaftW, shaftD, t.footprintShape)) continue;
        if (!isPerimeter(lx, lz, shaftW, shaftD)) continue;
        const key = `${lx},${y},${lz}`;
        if (windowSlots.has(key)) {
          const wb = windowBlock(t.windowTreatment, windowMat);
          if (wb) {
            placements.push({
              x: shaftOriginX + lx,
              y,
              z: shaftOriginZ + lz,
              p: PRI.WINDOW,
              id: wb,
              i: idx++,
            });
          }
          continue;
        }
        placements.push({
          x: shaftOriginX + lx,
          y,
          z: shaftOriginZ + lz,
          p: PRI.WALL,
          id: wall,
          i: idx++,
        });
      }
    }
  }

  // Crown
  const inset = t.crownStyle === "inset" ? 1 : 0;
  for (let layer = 0; layer < t.crownHeight; layer++) {
    const y = crownBaseY + layer;
    const pad = inset && layer > 0 ? inset : 0;
    for (let lx = pad; lx < shaftW - pad; lx++) {
      for (let lz = pad; lz < shaftD - pad; lz++) {
        if (!inFootprint(lx, lz, shaftW, shaftD, t.footprintShape)) continue;
        if (!isPerimeter(lx, lz, shaftW - pad * 2, shaftD - pad * 2)) {
          if (pad === 0 && !isPerimeter(lx, lz, shaftW, shaftD)) continue;
        }
        const onEdge =
          lx === pad ||
          lz === pad ||
          lx === shaftW - 1 - pad ||
          lz === shaftD - 1 - pad;
        if (!onEdge && t.crownStyle !== "flat_cap") continue;
        placements.push({
          x: shaftOriginX + lx,
          y,
          z: shaftOriginZ + lz,
          p: PRI.CROWN,
          id: layer === t.crownHeight - 1 && t.crownStyle === "stepped" ? accent : cap,
          i: idx++,
        });
      }
    }
  }

  const merged = mergePlacements(placements);
  const grounded = filterGroundedConnected26(merged, constraints.allowFloatingBlocks);
  if (grounded.length > constraints.maxBlockCount) {
    throw new Error(
      `Landmark tower exceeded maxBlockCount (${grounded.length} > ${constraints.maxBlockCount}).`,
    );
  }
  return grounded;
}

/** Total vertical extent in blocks (base + shaft + crown). */
export function landmarkTowerTotalHeight(blueprint: LandmarkTowerBlueprint): number {
  const t = blueprint.tower;
  return t.baseHeight + t.shaftHeight + t.crownHeight;
}
