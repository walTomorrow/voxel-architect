import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { getGenericBuildingPresetV2 } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import {
  isBlueprintValidationResultV2,
  validateBlueprint,
} from "@/src/lib/blueprints/validateBlueprint";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import type {
  BuilderActivityEvent,
  BuilderToolResult,
  GenerateBuildingPreviewRequest,
} from "@/src/lib/builder/builderToolTypes";
import { mapBuilderValidationIssues } from "@/src/lib/builder/mapBuilderValidationIssues";
import { resolvePresetFromPrompt } from "@/src/lib/builder/resolvePresetFromPrompt";

function failResult(
  error: string,
  assistantSummary: string,
  events: readonly BuilderActivityEvent[],
): BuilderToolResult {
  return {
    ok: false,
    toolKind: "generate",
    assistantSummary,
    schemaVersion: 2,
    error,
    activityEvents: events,
  };
}

/**
 * Server-controlled deterministic tool: v2 preset → validate → generate.
 */
export function generateBuildingPreview(
  request: GenerateBuildingPreviewRequest,
): BuilderToolResult {
  const baseEvents: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed building request", status: "success" },
  ];

  if (request.mode === "modify_current") {
    return failResult(
      "Modifying the current building is not available yet.",
      "I can't modify the current building yet. Ask me to create a new building (for example, a small stone cottage), and I'll generate a fresh preview.",
      [
        ...baseEvents,
        {
          id: "modify",
          label: "Modify current building — not available yet",
          status: "error",
        },
      ],
    );
  }

  const presetId = resolvePresetFromPrompt(request.prompt);
  const presetMeta = getGenericBuildingPresetV2(presetId);
  const presetLabel = presetMeta?.label ?? presetId;

  baseEvents.push({
    id: "target",
    label: `Chose v2 preset: ${presetLabel}`,
    status: "success",
  });

  let blueprint;
  try {
    blueprint = clonePresetBlueprintV2(presetId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load preset blueprint.";
    return failResult(msg, `Generation failed: ${msg}`, [
      ...baseEvents,
      { id: "blueprint", label: "Load v2 preset blueprint", status: "error" },
    ]);
  }

  baseEvents.push({
    id: "blueprint",
    label: "Loaded v2 component blueprint (preset)",
    status: "success",
  });

  const validation = validateBlueprint(blueprint);
  if (!isBlueprintValidationResultV2(validation)) {
    return failResult(
      "Unexpected validation result for v2 blueprint.",
      "Blueprint validation failed unexpectedly. The preview was not updated.",
      [
        ...baseEvents,
        { id: "validate", label: "Validate blueprint", status: "error" },
      ],
    );
  }

  const validationIssues = mapBuilderValidationIssues(validation);
  if (!validation.ok) {
    const err =
      validation.errors[0]?.message ?? "Blueprint validation failed.";
    return failResult(err, `I couldn't validate the building plan: ${err} The preview was not updated.`, [
      ...baseEvents,
      { id: "validate", label: "Validate blueprint", status: "error" },
    ]);
  }

  const normalized = validation.normalized ?? blueprint;
  baseEvents.push({
    id: "validate",
    label: "Validated blueprint",
    status: "success",
  });

  let blocks;
  try {
    blocks = generateStructure(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed.";
    return failResult(msg, `Voxel generation failed: ${msg} The preview was not updated.`, [
      ...baseEvents,
      { id: "generate", label: "Generate voxel structure", status: "error" },
    ]);
  }

  const blockCount = blocks.length;
  if (blockCount === 0) {
    return failResult(
      "Generator produced no blocks.",
      "Generation produced an empty structure. The preview was not updated.",
      [
        ...baseEvents,
        { id: "generate", label: "Generate voxel structure", status: "error" },
      ],
    );
  }

  baseEvents.push({
    id: "generate",
    label: `Generated voxel structure (${blockCount.toLocaleString()} blocks)`,
    status: "success",
  });
  baseEvents.push({
    id: "preview",
    label: "Ready to update builder preview",
    status: "success",
  });

  const warningNote =
    validationIssues.filter((i) => i.severity === "warning").length > 0
      ? ` (${validationIssues.filter((i) => i.severity === "warning").length} validation warning(s))`
      : "";

  return {
    ok: true,
    toolKind: "generate",
    assistantSummary: `Generated "${presetLabel}" using a v2 component blueprint preset (${blockCount.toLocaleString()} blocks)${warningNote}.`,
    blueprint: normalized,
    presetId,
    presetLabel,
    schemaVersion: 2,
    blocks,
    blockCount,
    validationIssues: validationIssues.length > 0 ? validationIssues : undefined,
    activityEvents: baseEvents,
  };
}
