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
  attachments: readonly BuilderImageAttachmentInput[] | null | undefined,
): boolean {
  return (attachments?.length ?? 0) > 0;
}
