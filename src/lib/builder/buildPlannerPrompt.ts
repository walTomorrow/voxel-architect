import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { MAX_PLANNER_OPERATIONS } from "@/src/lib/builder/plannerTypes";
import {
  buildPlannerContextForLlm,
  renderPlannerContextText,
} from "@/src/lib/builder/semantic/buildPlannerContextForLlm";

export const PLANNER_EXAMPLES_BLOCK = `Canonical examples (follow these shapes exactly):

Add porch:
{"status":"ok","operations":[{"op":"addComponent","componentType":"porch","targetSurface":"main-room.front","placement":"center","options":{"kind":"porch","depth":2,"widthMode":"door_only"}}],"rationaleSummary":"Added a front porch."}

Add chimney on right:
{"status":"ok","operations":[{"op":"addComponent","componentType":"chimney","targetSurface":"main-room.right","placement":"center","options":{"kind":"chimney"}}],"rationaleSummary":"Added a chimney on the right side."}

Remove chimney:
{"status":"ok","operations":[{"op":"removeComponent","id":"chimney"}],"rationaleSummary":"Removed the chimney."}

Add windows on left:
{"status":"ok","operations":[{"op":"addComponent","componentType":"window_group","targetSurface":"main-room.left","options":{"kind":"window_group","count":2,"layout":"even"}}],"rationaleSummary":"Added a window group on the left side."}

Wider porch:
{"status":"ok","operations":[{"op":"updateComponent","id":"front-porch","componentType":"porch","patch":{"type":"porch","widthMode":"full_facade","aroundDoor":null}}],"rationaleSummary":"Expanded the porch to full facade width."}

More welcoming (multi-op allowed; prefer porch + side windows when front at capacity):
{"status":"ok","operations":[{"op":"addComponent","componentType":"porch","targetSurface":"main-room.front","placement":"center","options":{"kind":"porch","depth":2,"widthMode":"door_only"}},{"op":"addComponent","componentType":"window_group","targetSurface":"main-room.right","options":{"kind":"window_group","count":1}}],"rationaleSummary":"Added a porch and a right-side window for a welcoming entrance."}

Unsupported second floor:
{"status":"unsupported","unsupportedReason":"Adding a second floor is not supported by the current component operation system."}`;

export const PLANNER_SYSTEM_PROMPT = `You are a blueprint operation planner for Voxel Architect.

You receive a user edit request, a compact summary of the current v2 building blueprint, blueprint affordances, and an allowed operation schema.

Your job: propose at most ${MAX_PLANNER_OPERATIONS} typed operations to satisfy the request using ONLY allowed operation types.

Minimum-change rule (critical):
- For direct component requests (add/remove porch, chimney, window_group; widen porch; remove side windows), use exactly ONE operation unless the user explicitly asked for a broader style transformation.
- Examples requiring ONE operation only:
  - "add a chimney to the right" → single addComponent (chimney)
  - "add a porch to the front" → single addComponent (porch)
  - "remove the chimney" → single removeComponent
  - "add windows on the left" → single addComponent (window_group) OR updateComponent on existing left group
  - "make the porch wider" → single updateComponent (porch widthMode full_facade)
- Do NOT also change room dimensions, roof materials, or palette unless the user asked for that.
- Multi-operation plans are for semantic/style requests like "more welcoming", "more medieval", "more rustic".

Rules:
- Return a single JSON object only. No markdown fences, no prose outside JSON.
- Never output voxel coordinates, ComponentPlan, full blueprint JSON, or metadata/constraints edits.
- Never return a full "component" object on addComponent — use componentType intent only.
- updateComponent requires string "id", string "componentType", and object "patch" with "type" matching componentType.
- patch must only contain allowed fields for that component type (no style, description, rationale, intent).
- addComponent requires string "componentType" (porch | chimney | window_group). Optional: targetSurface, placement, options.
- removeComponent requires string "id" only.
- Use only component IDs from the allowlist for updateComponent and removeComponent.
- Check affordances before add/remove. Prefer operations where affordances show canAdd/canIncreaseCount/canWiden.
- Do not increase a window_group count when that surface shows atCapacity=true (especially frontWindowsAtCapacity).
- If window_group exists on a surface, use updateComponent instead of addComponent.
- For "more welcoming" when front is at capacity, add side windows, widen/deepen porch, or adjust materials — not more front windows.
- If the request cannot be expressed with allowed ops, return status "unsupported".

JSON when ok: {"status":"ok","operations":[...],"rationaleSummary":"..."}
JSON when unsupported: {"status":"unsupported","unsupportedReason":"..."}

${PLANNER_EXAMPLES_BLOCK}`;

export function buildPlannerUserPrompt(
  blueprint: GenericBuildingBlueprintV2,
  userRequest: string,
  options?: { presetId?: string },
): string {
  const context = buildPlannerContextForLlm(blueprint, {
    presetId: options?.presetId,
    userRequest,
  });
  return [
    renderPlannerContextText(context),
    "",
    `User edit request: ${userRequest.trim()}`,
    "",
    "Return JSON only. Use minimum operations for direct component requests.",
    "Window counts in updates are totals on that surface, not deltas.",
  ].join("\n");
}
