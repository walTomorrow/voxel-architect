import type { BuilderImageAttachmentInput } from "@/src/lib/builder/builderChatTypes";
import { extractReferenceBuildIntentFromVision } from "@/src/lib/builder/reference/extractReferenceBuildIntentFromVision";
import { LANDMARK_TOWER_DEFAULT_INTENT } from "@/src/lib/builder/reference/landmarkTowerDefaults";
import { inferReferenceBuildIntentFromText } from "@/src/lib/builder/reference/inferReferenceBuildIntentFromText";
import { isLandmarkTowerRequest } from "@/src/lib/builder/reference/isLandmarkTowerRequest";
import type { ReferenceBuildIntent } from "@/src/lib/builder/reference/referenceBuildIntentTypes";

export type ResolveReferenceIntentResult = {
  readonly intent: ReferenceBuildIntent;
  readonly usedFallback: boolean;
  readonly sourceLabel: string;
};

let testIntentOverride: ReferenceBuildIntent | null | undefined;

export function setReferenceIntentExtractorForTests(
  intent: ReferenceBuildIntent | null | undefined,
): void {
  testIntentOverride = intent;
}

/**
 * Text inference always; vision extraction deferred to async path when configured.
 * Synchronous resolver for generate tool.
 */
export function resolveReferenceBuildIntentSync(
  prompt: string,
  options?: { hasImage?: boolean },
): ResolveReferenceIntentResult | null {
  if (!isLandmarkTowerRequest(prompt) && !options?.hasImage) {
    return null;
  }

  if (testIntentOverride !== undefined) {
    if (testIntentOverride === null) {
      return {
        intent: LANDMARK_TOWER_DEFAULT_INTENT,
        usedFallback: true,
        sourceLabel: "test fallback",
      };
    }
    return {
      intent: testIntentOverride,
      usedFallback: false,
      sourceLabel: "test override",
    };
  }

  const inferred = inferReferenceBuildIntentFromText(prompt, options);
  if (inferred) {
    return {
      intent: inferred,
      usedFallback: false,
      sourceLabel: options?.hasImage ? "text+image inference" : "text inference",
    };
  }

  if (options?.hasImage || isLandmarkTowerRequest(prompt)) {
    return {
      intent: {
        ...LANDMARK_TOWER_DEFAULT_INTENT,
        source: options?.hasImage ? "text_and_image" : "text",
        notableFeatures: [...LANDMARK_TOWER_DEFAULT_INTENT.notableFeatures],
        styleTags: [...LANDMARK_TOWER_DEFAULT_INTENT.styleTags],
        colorPalette: {
          ...LANDMARK_TOWER_DEFAULT_INTENT.colorPalette,
          labels: [...LANDMARK_TOWER_DEFAULT_INTENT.colorPalette.labels],
        },
      },
      usedFallback: true,
      sourceLabel: "default landmark intent",
    };
  }

  return null;
}

/**
 * Async resolver used when images are present, or when the prompt is a landmark
 * tower request. Images always attempt vision extraction regardless of text keywords —
 * the model returns buildingFamily "unknown" if the image is not a tower, and
 * the pipeline falls back to text inference or the default intent.
 *
 * Call this from the generation chat turn whenever hasImage is true.
 */
export async function resolveReferenceBuildIntentAsync(
  prompt: string,
  attachments: readonly BuilderImageAttachmentInput[],
): Promise<ResolveReferenceIntentResult | null> {
  const hasImage = attachments.length > 0;

  if (!isLandmarkTowerRequest(prompt) && !hasImage) {
    return null;
  }

  if (testIntentOverride !== undefined) {
    return resolveReferenceBuildIntentSync(prompt, { hasImage });
  }

  // When images are present, always attempt vision extraction first.
  // The extractor returns null or "unknown" family on failure/non-tower images,
  // so the fallback chain still runs.
  if (hasImage) {
    const visionIntent = await extractReferenceBuildIntentFromVision(prompt, attachments);
    if (visionIntent && visionIntent.buildingFamily !== "unknown") {
      return {
        intent: visionIntent,
        usedFallback: false,
        sourceLabel: "vision extraction",
      };
    }
  }

  // Text inference handles explicit tower keywords (with or without image).
  const inferred = inferReferenceBuildIntentFromText(prompt, { hasImage });
  if (inferred) {
    return {
      intent: inferred,
      usedFallback: false,
      sourceLabel: hasImage ? "text+image inference" : "text inference",
    };
  }

  // Fall back to the generic landmark default whenever we entered this path
  // (either an image was present or the text was a landmark request).
  return {
    intent: {
      ...LANDMARK_TOWER_DEFAULT_INTENT,
      source: hasImage ? "text_and_image" : "text",
      notableFeatures: [...LANDMARK_TOWER_DEFAULT_INTENT.notableFeatures],
      styleTags: [...LANDMARK_TOWER_DEFAULT_INTENT.styleTags],
      colorPalette: {
        ...LANDMARK_TOWER_DEFAULT_INTENT.colorPalette,
        labels: [...LANDMARK_TOWER_DEFAULT_INTENT.colorPalette.labels],
      },
    },
    usedFallback: true,
    sourceLabel: "default landmark intent",
  };
}
