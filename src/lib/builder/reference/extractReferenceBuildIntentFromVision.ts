import {
  buildVisionRequestBody,
  getWorkersAiConfig,
  workersAiRunUrl,
} from "@/src/lib/builder/callWorkersAiChat";
import type { BuilderImageAttachmentInput } from "@/src/lib/builder/builderChatTypes";
import { LANDMARK_TOWER_DEFAULT_INTENT } from "@/src/lib/builder/reference/landmarkTowerDefaults";
import type { ReferenceBuildIntent } from "@/src/lib/builder/reference/referenceBuildIntentTypes";
import { extractWorkersAiResponseText } from "@/src/lib/builder/workersAiResponseExtract";

const VISION_INTENT_MAX_TOKENS = 1024;

const EXTRACTION_PROMPT = `Analyze the attached reference image and return ONLY a JSON object (no markdown) describing building intent for a voxel landmark tower generator.

Use this shape:
{
  "buildingFamily": "landmark_tower" | "generic_building" | "unknown",
  "confidence": "low" | "medium" | "high",
  "styleTags": string[],
  "colorPalette": { "labels": string[], "summary": string },
  "materialRoles": { "wall": string, "cap": string, "accent": string, "base": string, "window": string },
  "silhouette": {
    "verticality": "low" | "medium" | "tall" | "very_tall",
    "footprint": "narrow" | "medium" | "wide",
    "footprintShape": "square" | "octagonal" | "circular_approx" | "unknown",
    "base": "same_width" | "slightly_wider" | "much_wider",
    "top": "flat" | "dark_cap" | "stepped_crown" | "roofed_crown"
  },
  "facade": {
    "windowPattern": "few" | "regular_rows" | "vertical_bands" | "narrow_openings" | "unknown",
    "windowTreatment": "glass_block" | "glass_pane" | "open" | "unknown"
  },
  "notableFeatures": string[],
  "rationaleSummary": string
}

Approximate visible colors and forms only — not exact reconstruction.`;

function parseJsonIntent(raw: string): ReferenceBuildIntent | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    if (typeof parsed.rationaleSummary !== "string") return null;
    return {
      source: "image",
      confidence:
        parsed.confidence === "low" || parsed.confidence === "high"
          ? parsed.confidence
          : "medium",
      buildingFamily:
        parsed.buildingFamily === "landmark_tower" ||
        parsed.buildingFamily === "generic_building"
          ? parsed.buildingFamily
          : "unknown",
      styleTags: Array.isArray(parsed.styleTags)
        ? parsed.styleTags.filter((t): t is string => typeof t === "string")
        : [],
      colorPalette: {
        labels: Array.isArray((parsed.colorPalette as { labels?: unknown })?.labels)
          ? ((parsed.colorPalette as { labels: unknown[] }).labels.filter(
              (l): l is ReferenceBuildIntent["colorPalette"]["labels"][number] =>
                typeof l === "string",
            ) as ReferenceBuildIntent["colorPalette"]["labels"])
          : [],
        summary:
          typeof (parsed.colorPalette as { summary?: unknown })?.summary === "string"
            ? (parsed.colorPalette as { summary: string }).summary
            : undefined,
      },
      materialRoles: {
        wall: coerceRole(parsed.materialRoles, "wall", LANDMARK_TOWER_DEFAULT_INTENT.materialRoles.wall),
        cap: coerceRole(parsed.materialRoles, "cap", LANDMARK_TOWER_DEFAULT_INTENT.materialRoles.cap),
        accent: coerceRole(
          parsed.materialRoles,
          "accent",
          LANDMARK_TOWER_DEFAULT_INTENT.materialRoles.accent,
        ),
        base: coerceRole(parsed.materialRoles, "base", LANDMARK_TOWER_DEFAULT_INTENT.materialRoles.base),
        window: coerceRole(
          parsed.materialRoles,
          "window",
          LANDMARK_TOWER_DEFAULT_INTENT.materialRoles.window,
        ),
      },
      silhouette: {
        verticality: coerceEnum(
          parsed.silhouette,
          "verticality",
          ["low", "medium", "tall", "very_tall"],
          LANDMARK_TOWER_DEFAULT_INTENT.silhouette.verticality,
        ),
        footprint: coerceEnum(
          parsed.silhouette,
          "footprint",
          ["narrow", "medium", "wide"],
          LANDMARK_TOWER_DEFAULT_INTENT.silhouette.footprint,
        ),
        footprintShape: coerceEnum(
          parsed.silhouette,
          "footprintShape",
          ["square", "octagonal", "circular_approx", "unknown"],
          LANDMARK_TOWER_DEFAULT_INTENT.silhouette.footprintShape,
        ),
        base: coerceEnum(
          parsed.silhouette,
          "base",
          ["same_width", "slightly_wider", "much_wider"],
          LANDMARK_TOWER_DEFAULT_INTENT.silhouette.base,
        ),
        top: coerceEnum(
          parsed.silhouette,
          "top",
          ["flat", "dark_cap", "stepped_crown", "roofed_crown"],
          LANDMARK_TOWER_DEFAULT_INTENT.silhouette.top,
        ),
      },
      facade: {
        windowPattern: coerceEnum(
          parsed.facade,
          "windowPattern",
          ["few", "regular_rows", "vertical_bands", "narrow_openings", "unknown"],
          LANDMARK_TOWER_DEFAULT_INTENT.facade.windowPattern,
        ),
        windowTreatment: coerceEnum(
          parsed.facade,
          "windowTreatment",
          ["glass_block", "glass_pane", "open", "unknown"],
          LANDMARK_TOWER_DEFAULT_INTENT.facade.windowTreatment,
        ),
      },
      notableFeatures: Array.isArray(parsed.notableFeatures)
        ? parsed.notableFeatures.filter((f): f is string => typeof f === "string")
        : [],
      rationaleSummary: parsed.rationaleSummary,
    };
  } catch {
    return null;
  }
}

function coerceRole(
  container: unknown,
  key: string,
  fallback: ReferenceBuildIntent["materialRoles"]["wall"],
): ReferenceBuildIntent["materialRoles"]["wall"] {
  if (!container || typeof container !== "object") return fallback;
  const value = (container as Record<string, unknown>)[key];
  return typeof value === "string" ? (value as ReferenceBuildIntent["materialRoles"]["wall"]) : fallback;
}

function coerceEnum<T extends string>(
  container: unknown,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!container || typeof container !== "object") return fallback;
  const value = (container as Record<string, unknown>)[key];
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export async function extractReferenceBuildIntentFromVision(
  userText: string,
  attachments: readonly BuilderImageAttachmentInput[],
): Promise<ReferenceBuildIntent | null> {
  if (attachments.length === 0) return null;

  const config = getWorkersAiConfig();
  if (!config) return null;

  const body = buildVisionRequestBody(
    [{ role: "user", content: `${EXTRACTION_PROMPT}\n\nUser note: ${userText}` }],
    attachments,
    undefined,
    { maxTokens: VISION_INTENT_MAX_TOKENS, temperature: 0.2 },
  );

  try {
    const response = await fetch(workersAiRunUrl(config.accountId, config.model), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const rawText = await response.text();
    let json: unknown = {};
    try {
      json = JSON.parse(rawText);
    } catch {
      return null;
    }
    const extracted = extractWorkersAiResponseText(json, response.status, rawText.length);
    if (!extracted.text) return null;
    const intent = parseJsonIntent(extracted.text);
    if (!intent) return null;
    return {
      ...intent,
      source: userText.trim().length > 0 ? "text_and_image" : "image",
    };
  } catch {
    return null;
  }
}
