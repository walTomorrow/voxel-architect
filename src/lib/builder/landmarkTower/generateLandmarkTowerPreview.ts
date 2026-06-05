import {
  DEFAULT_LANDMARK_TOWER_PRESET_ID,
  getLandmarkTowerPreset,
} from "@/src/lib/blueprints/sampleLandmarkTowerBlueprints";
import { isLandmarkTowerBlueprint } from "@/src/lib/blueprints/types/landmarkTower";
import { validateLandmarkTowerBlueprint } from "@/src/lib/blueprints/validateLandmarkTower";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { landmarkTowerTotalHeight } from "@/src/lib/generation/generators/generateLandmarkTower";
import type {
  BuilderActivityEvent,
  BuilderToolResult,
  GenerateBuildingPreviewRequest,
} from "@/src/lib/builder/builderToolTypes";
import { mapBuilderValidationIssues } from "@/src/lib/builder/mapBuilderValidationIssues";
import { mapReferenceBuildIntentToTowerBlueprint } from "@/src/lib/builder/reference/mapReferenceBuildIntentToTowerBlueprint";
import {
  resolveReferenceBuildIntentSync,
  type ResolveReferenceIntentResult,
} from "@/src/lib/builder/reference/resolveReferenceBuildIntent";

function formatMappingSummary(lines: readonly string[]): string {
  if (lines.length === 0) return "";
  const mapped = lines
    .map((l) => {
      const m = l.match(/^(.+?) → (\S+) for (.+)$/);
      if (!m) return l;
      return `${m[1]} to ${m[2]} for the ${m[3]}`;
    })
    .join(", ");
  return `I mapped ${mapped}. This is an approximate palette, not an exact color match.`;
}

export function generateLandmarkTowerPreview(
  request: GenerateBuildingPreviewRequest,
  options?: { hasImage?: boolean; resolvedIntent?: ResolveReferenceIntentResult },
): BuilderToolResult {
  const baseEvents: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed landmark tower request", status: "success" },
  ];

  const resolved =
    options?.resolvedIntent ??
    resolveReferenceBuildIntentSync(request.prompt, {
      hasImage: options?.hasImage,
    });
  if (!resolved) {
    return {
      ok: false,
      toolKind: "generate",
      assistantSummary: "Could not resolve landmark tower intent.",
      schemaVersion: 2,
      error: "Not a landmark tower request.",
      activityEvents: baseEvents,
    };
  }

  baseEvents.push({
    id: "intent",
    label: resolved.usedFallback
      ? `Reference intent: fallback (${resolved.sourceLabel})`
      : `Reference intent: ${resolved.sourceLabel}`,
    status: "success",
  });

  const { blueprint: draft, mapping } = mapReferenceBuildIntentToTowerBlueprint(
    resolved.intent,
    request.prompt,
  );

  const presetMeta = getLandmarkTowerPreset(DEFAULT_LANDMARK_TOWER_PRESET_ID);
  const presetLabel = presetMeta?.label ?? "Landmark tower";

  const validation = validateLandmarkTowerBlueprint(draft);
  const validationIssues = mapBuilderValidationIssues(validation);
  if (!validation.ok) {
    const err = validation.errors[0]?.message ?? "Validation failed.";
    return {
      ok: false,
      toolKind: "generate",
      assistantSummary: `I couldn't validate the landmark tower plan: ${err}`,
      schemaVersion: 2,
      error: err,
      activityEvents: [
        ...baseEvents,
        { id: "validate", label: "Validate landmark tower blueprint", status: "error" },
      ],
    };
  }

  const normalized = (validation.normalized ?? draft) as typeof draft;
  if (!isLandmarkTowerBlueprint(normalized)) {
    return {
      ok: false,
      toolKind: "generate",
      assistantSummary: "Landmark tower blueprint expected after validation.",
      schemaVersion: 2,
      error: "Invalid structure type after validation.",
      activityEvents: baseEvents,
    };
  }
  baseEvents.push({
    id: "validate",
    label: "Validated landmark tower blueprint",
    status: "success",
  });

  let blocks;
  try {
    blocks = generateStructure(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed.";
    return {
      ok: false,
      toolKind: "generate",
      assistantSummary: `Voxel generation failed: ${msg}`,
      schemaVersion: 2,
      error: msg,
      activityEvents: [
        ...baseEvents,
        { id: "generate", label: "Generate landmark tower", status: "error" },
      ],
    };
  }

  const blockCount = blocks.length;
  const totalH = landmarkTowerTotalHeight(normalized);
  const mappingNote = formatMappingSummary(mapping.mappingSummary);

  baseEvents.push({
    id: "generate",
    label: `Generated landmark tower (${blockCount.toLocaleString()} blocks, ~${totalH} tall)`,
    status: "success",
  });
  baseEvents.push({
    id: "preview",
    label: "Ready to update builder preview",
    status: "success",
  });

  const hooverMention = /\bhoover\b|\bstanford\b/i.test(request.prompt)
    ? " (Stanford Hoover Tower was named as inspiration)"
    : "";

  return {
    ok: true,
    toolKind: "generate",
    assistantSummary: [
      `I made an approximate landmark tower inspired by your reference${hooverMention}. It is not an exact reconstruction.`,
      `Shaft height ${normalized.tower.shaftHeight}, total ~${totalH} blocks tall, ${normalized.tower.footprintShape} footprint.`,
      mappingNote,
    ]
      .filter((s) => s.length > 0)
      .join(" "),
    blueprint: normalized,
    presetId: DEFAULT_LANDMARK_TOWER_PRESET_ID,
    presetLabel,
    schemaVersion: 2,
    blocks,
    blockCount,
    validationIssues: validationIssues.length > 0 ? validationIssues : undefined,
    activityEvents: baseEvents,
    plannerPath: "deterministic",
  };
}
