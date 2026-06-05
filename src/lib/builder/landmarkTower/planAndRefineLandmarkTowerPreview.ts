import {
  isLandmarkTowerBlueprint,
  type LandmarkTowerBlueprint,
} from "@/src/lib/blueprints/types/landmarkTower";
import { validateLandmarkTowerBlueprint } from "@/src/lib/blueprints/validateLandmarkTower";
import { generateStructure } from "@/src/lib/generation/generateStructure";
import { landmarkTowerTotalHeight } from "@/src/lib/generation/generators/generateLandmarkTower";
import type {
  BuilderActivityEvent,
  BuilderToolResult,
} from "@/src/lib/builder/builderToolTypes";
import { mapBuilderValidationIssues } from "@/src/lib/builder/mapBuilderValidationIssues";
import { mapTowerRefinementPrompt } from "@/src/lib/builder/landmarkTower/mapTowerRefinementPrompt";
import { applyTowerBlueprintOperations } from "@/src/lib/builder/landmarkTower/towerBlueprintOperations";
import type { PlanRefineRequest } from "@/src/lib/builder/plannerTypes";

function formatMappingSummary(lines: readonly string[] | undefined): string {
  if (!lines || lines.length === 0) return "";
  const mapped = lines
    .map((l) => {
      const m = l.match(/^(.+?) → (\S+) for (.+)$/);
      if (!m) return l;
      return `${m[1]} to ${m[2]} for the ${m[3]}`;
    })
    .join(", ");
  return `${mapped}. This is an approximate palette, not an exact color match.`;
}

export function planAndRefineLandmarkTowerPreview(
  request: PlanRefineRequest & { readonly blueprint: LandmarkTowerBlueprint },
): BuilderToolResult {
  const baseEvents: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed landmark tower refinement", status: "success" },
    { id: "blueprint", label: "Using current landmark tower blueprint", status: "success" },
  ];

  const plan = mapTowerRefinementPrompt(request.prompt, request.blueprint);
  if (!plan) {
    return {
      ok: false,
      toolKind: "refine",
      assistantSummary:
        "I couldn't map that request to a supported landmark tower edit yet. Try height, base width, wall/cap colors, windows, or footprint shape.",
      schemaVersion: 2,
      error: "Unsupported landmark tower refinement.",
      activityEvents: baseEvents,
      plannerPath: "deterministic",
    };
  }

  baseEvents.push({
    id: "plan-det",
    label: `Matched landmark tower edit: ${plan.planLabel}`,
    status: "success",
  });

  const applied = applyTowerBlueprintOperations(request.blueprint, plan.operations);
  if (!applied.ok) {
    return {
      ok: false,
      toolKind: "refine",
      assistantSummary: `Could not apply the change: ${applied.error}`,
      schemaVersion: 2,
      error: applied.error,
      activityEvents: [...baseEvents, { id: "apply", label: "Apply tower operations", status: "error" }],
      plannerPath: "deterministic",
    };
  }

  const validation = validateLandmarkTowerBlueprint(applied.blueprint);
  if (!validation.ok) {
    const err = validation.errors[0]?.message ?? "Validation failed.";
    return {
      ok: false,
      toolKind: "refine",
      assistantSummary: `Validation failed: ${err}`,
      schemaVersion: 2,
      error: err,
      activityEvents: [...baseEvents, { id: "validate", label: "Validate tower blueprint", status: "error" }],
      plannerPath: "deterministic",
    };
  }

  const normalizedRaw = validation.normalized ?? applied.blueprint;
  if (!isLandmarkTowerBlueprint(normalizedRaw)) {
    return {
      ok: false,
      toolKind: "refine",
      assistantSummary: "Expected landmark tower blueprint after validation.",
      schemaVersion: 2,
      error: "Invalid structure type.",
      activityEvents: baseEvents,
      plannerPath: "deterministic",
    };
  }
  const normalized = normalizedRaw;
  let blocks;
  try {
    blocks = generateStructure(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed.";
    return {
      ok: false,
      toolKind: "refine",
      assistantSummary: msg,
      schemaVersion: 2,
      error: msg,
      activityEvents: [...baseEvents, { id: "generate", label: "Regenerate tower", status: "error" }],
      plannerPath: "deterministic",
    };
  }

  const totalH = landmarkTowerTotalHeight(normalized);
  const mappingNote = formatMappingSummary(plan.mappingSummary);

  baseEvents.push({ id: "apply", label: `Applied: ${applied.labels.join("; ")}`, status: "success" });
  baseEvents.push({ id: "validate", label: "Validated landmark tower", status: "success" });
  baseEvents.push({
    id: "generate",
    label: `Regenerated landmark tower (${blocks.length.toLocaleString()} blocks, ~${totalH} tall)`,
    status: "success",
  });
  baseEvents.push({ id: "preview", label: "Ready to update builder preview", status: "success" });

  return {
    ok: true,
    toolKind: "refine",
    assistantSummary: [
      `Updated the approximate landmark tower: ${plan.planLabel}. It is not an exact reconstruction.`,
      mappingNote ? `I mapped ${mappingNote}` : "",
    ]
      .filter((s) => s.length > 0)
      .join(" "),
    blueprint: normalized,
    schemaVersion: 2,
    blocks,
    blockCount: blocks.length,
    appliedOperations: [...applied.labels],
    activityEvents: baseEvents,
    plannerPath: "deterministic",
    rationaleSummary: plan.planLabel,
  };
}
