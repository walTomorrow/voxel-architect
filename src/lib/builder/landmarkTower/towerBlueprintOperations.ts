import type {
  LandmarkTowerBlueprint,
  LandmarkTowerMaterials,
  LandmarkTowerParams,
} from "@/src/lib/blueprints/types/landmarkTower";

export type TowerBlueprintOperation =
  | { readonly op: "setTowerMaterials"; readonly patch: Partial<LandmarkTowerMaterials> }
  | { readonly op: "updateTowerParams"; readonly patch: Partial<LandmarkTowerParams> };

export function applyTowerBlueprintOperations(
  blueprint: LandmarkTowerBlueprint,
  operations: readonly TowerBlueprintOperation[],
): { readonly ok: true; readonly blueprint: LandmarkTowerBlueprint; readonly labels: readonly string[] } | { readonly ok: false; readonly error: string } {
  let next = structuredClone(blueprint);
  const labels: string[] = [];

  for (const op of operations) {
    if (op.op === "setTowerMaterials") {
      next = {
        ...next,
        materials: { ...next.materials, ...op.patch },
      };
      for (const [k, v] of Object.entries(op.patch)) {
        if (v) labels.push(`materials.${k}=${v}`);
      }
    } else if (op.op === "updateTowerParams") {
      next = {
        ...next,
        tower: { ...next.tower, ...op.patch },
      };
      for (const [k, v] of Object.entries(op.patch)) {
        if (v !== undefined) labels.push(`tower.${k}=${String(v)}`);
      }
    }
  }

  return { ok: true, blueprint: next, labels };
}
