import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { CLASSIC_MATERIAL_KEYS } from "@/src/app/generic-lab/genericLabUtils";
import type { AllowedOperationsSchema } from "@/src/lib/builder/plannerTypes";
import { MAX_PLANNER_OPERATIONS } from "@/src/lib/builder/plannerTypes";
import { summarizeBlueprintForPlanner } from "@/src/lib/builder/summarizeBlueprintForPlanner";

export const PLANNER_ROOM_WIDTH = { min: 5, max: 17 } as const;
export const PLANNER_ROOM_DEPTH = { min: 5, max: 13 } as const;
export const PLANNER_ROOM_HEIGHT = { min: 4, max: 9 } as const;
export const PLANNER_PORCH_DEPTH = { min: 1, max: 8 } as const;
export const PLANNER_WINDOW_COUNT = { min: 0, max: 12 } as const;
export const PLANNER_ROOF_LAYERS = { min: 1, max: 3 } as const;

export function buildAllowedOperationsSchema(
  blueprint: GenericBuildingBlueprintV2,
): AllowedOperationsSchema {
  const summary = summarizeBlueprintForPlanner(blueprint);
  return {
    maxOperations: MAX_PLANNER_OPERATIONS,
    allowedOpTypes: ["setMaterialPalette", "updateComponent"],
    componentAllowlist: summary.components.map((c) => ({ id: c.id, type: c.type })),
    materialKeys: [...CLASSIC_MATERIAL_KEYS],
    roofKinds: ["pitched_gable", "shed", "none"],
    roomPatch: {
      width: PLANNER_ROOM_WIDTH,
      depth: PLANNER_ROOM_DEPTH,
      wallHeight: PLANNER_ROOM_HEIGHT,
    },
    windowCount: PLANNER_WINDOW_COUNT,
    porchDepth: PLANNER_PORCH_DEPTH,
    roofLayers: PLANNER_ROOF_LAYERS,
    unsupported: [
      "add or remove components",
      "porch width changes",
      "door resize",
      "setMaterialOverride",
      "metadata or constraints edits",
      "full blueprint rewrite",
      "voxel coordinates or ComponentPlan",
    ],
  };
}

export function renderAllowedOperationsSchemaText(schema: AllowedOperationsSchema): string {
  const lines: string[] = [
    "Allowed operations:",
    `- maxOperations: ${schema.maxOperations}`,
    `- op types: ${schema.allowedOpTypes.join(", ")}`,
    "- component allowlist (id, type):",
  ];
  for (const c of schema.componentAllowlist) {
    lines.push(`  - ${c.id} (${c.type})`);
  }
  lines.push(`- material keys: ${schema.materialKeys.join(", ")}`);
  lines.push(`- roof kinds: ${schema.roofKinds.join(", ")}`);
  lines.push(
    `- room patch ranges: width ${schema.roomPatch.width.min}-${schema.roomPatch.width.max}, depth ${schema.roomPatch.depth.min}-${schema.roomPatch.depth.max}, wallHeight ${schema.roomPatch.wallHeight.min}-${schema.roomPatch.wallHeight.max}`,
  );
  lines.push(
    `- window_group count: ${schema.windowCount.min}-${schema.windowCount.max}`,
  );
  lines.push(`- porch depth: ${schema.porchDepth.min}-${schema.porchDepth.max}`);
  lines.push(`- roof layers: ${schema.roofLayers.min}-${schema.roofLayers.max}`);
  lines.push("- unsupported:");
  for (const u of schema.unsupported) {
    lines.push(`  - ${u}`);
  }
  return lines.join("\n");
}
