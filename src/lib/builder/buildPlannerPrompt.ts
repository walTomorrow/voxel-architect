import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  buildAllowedOperationsSchema,
  renderAllowedOperationsSchemaText,
} from "@/src/lib/builder/buildAllowedOperationsSchema";
import {
  renderBlueprintSummaryText,
  summarizeBlueprintForPlanner,
} from "@/src/lib/builder/summarizeBlueprintForPlanner";
import { MAX_PLANNER_OPERATIONS } from "@/src/lib/builder/plannerTypes";

export const PLANNER_SYSTEM_PROMPT = `You are a blueprint operation planner for Voxel Architect.

You receive a user edit request, a compact summary of the current v2 building blueprint, and an allowed operation schema.

Your job: propose at most ${MAX_PLANNER_OPERATIONS} typed operations to satisfy the request using ONLY allowed operation types and component IDs from the schema.

Rules:
- Return a single JSON object only. No markdown fences, no prose outside JSON.
- Never output voxel coordinates, ComponentPlan, full blueprint JSON, or metadata/constraints edits.
- Use only component IDs from the allowlist.
- Allowed ops: setMaterialPalette, updateComponent only.
- If the request cannot be expressed with allowed ops, return status "unsupported" with a short unsupportedReason.
- Prefer small, safe edits (material palette, room dimensions, roof kind/layers, window count on existing groups, porch depth, chimney placement).
- Do not add or remove components. Do not change porch width.

JSON shape when ok:
{"status":"ok","operations":[...],"rationaleSummary":"short summary"}

Each operation must use exact field names:
- setMaterialPalette: {"op":"setMaterialPalette","patch":{"roof":"oak_planks"}}
- updateComponent: {"op":"updateComponent","id":"main-room","componentType":"room","patch":{"type":"room","wallHeight":6}}

Do not add extra keys on operations (no description, reason, or nested component objects).
Use "id" not componentId; use "componentType" not type; put edits inside "patch".

JSON shape when unsupported:
{"status":"unsupported","unsupportedReason":"short reason"}`;

export function buildPlannerUserPrompt(
  blueprint: GenericBuildingBlueprintV2,
  userRequest: string,
  options?: { presetId?: string },
): string {
  const summary = summarizeBlueprintForPlanner(blueprint, options);
  const schema = buildAllowedOperationsSchema(blueprint);
  return [
    renderBlueprintSummaryText(summary),
    "",
    renderAllowedOperationsSchemaText(schema),
    "",
    `User edit request: ${userRequest.trim()}`,
    "",
    "Return JSON only.",
  ].join("\n");
}
