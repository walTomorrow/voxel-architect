import type { BuilderImageAttachmentInput } from "@/src/lib/builder/builderChatTypes";
import type { BuilderActivityEvent } from "@/src/lib/builder/builderToolTypes";
import { buildChatOnlyActivitySteps } from "@/src/lib/builder/builderActivityFromTool";

export type BuilderActivityStep = BuilderActivityEvent;

export function buildMockActivitySteps(
  hasImage: boolean,
): readonly BuilderActivityStep[] {
  return buildChatOnlyActivitySteps(hasImage);
}

export function hasImageAttachment(
  attachment: BuilderImageAttachmentInput | null | undefined,
): boolean {
  return attachment != null && attachment.type === "image";
}
