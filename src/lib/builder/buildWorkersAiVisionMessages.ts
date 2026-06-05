import { buildBuilderSystemPromptWithContext } from "@/src/lib/builder/augmentChatWithBuildContext";
import type {
  BuilderChatMessageInput,
  BuilderImageAttachmentInput,
} from "@/src/lib/builder/builderChatTypes";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";

export type WorkersAiVisionChatMessage = {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
};

const VISION_CAPABILITY_NOTE =
  "You can see the reference image attached to the latest user message. Describe visible structure, materials, roof, windows, doors, porch, chimney, steps, and overall silhouette. Never claim you cannot process images.";

export function imageAttachmentDataUrl(attachment: BuilderImageAttachmentInput): string {
  return `data:${attachment.mimeType};base64,${attachment.dataBase64}`;
}

/** Native Workers AI vision accepts one image per request via a top-level `image` field. */
export function primaryImageDataUrl(
  attachments: readonly BuilderImageAttachmentInput[],
): string | null {
  const primary = attachments[0];
  return primary ? imageAttachmentDataUrl(primary) : null;
}

export function buildWorkersAiVisionMessages(
  history: readonly BuilderChatMessageInput[],
  attachments: readonly BuilderImageAttachmentInput[],
  context?: {
    readonly currentBlueprint?: GenericBuildingBlueprintV2 | null;
    readonly presetId?: string;
    readonly currentBlockCount?: number;
  },
): WorkersAiVisionChatMessage[] {
  const systemBase = buildBuilderSystemPromptWithContext(context?.currentBlueprint, {
    presetId: context?.presetId,
    generatedBlockCount: context?.currentBlockCount,
  });
  const systemContent = `${systemBase}\n\n${VISION_CAPABILITY_NOTE}`;

  const out: WorkersAiVisionChatMessage[] = [{ role: "system", content: systemContent }];

  if (history.length === 0) return out;

  const prior = history.slice(0, -1);
  const last = history[history.length - 1]!;

  for (const message of prior) {
    out.push({ role: message.role, content: message.content });
  }

  out.push({ role: last.role, content: last.content });
  return out;
}
