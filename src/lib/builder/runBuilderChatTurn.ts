import { callWorkersAiChat } from "@/src/lib/builder/callWorkersAiChat";
import type {
  BuilderChatMessageInput,
  BuilderImageAttachmentInput,
} from "@/src/lib/builder/builderChatTypes";
import { hasImageAttachments } from "@/src/lib/builder/builderChatTypes";
import type { BuilderBlueprint } from "@/src/lib/builder/builderToolTypes";
import type {
  BuilderChatToolSuccessResponse,
  BuilderToolResult,
} from "@/src/lib/builder/builderToolTypes";
import { formatToolResultForModel } from "@/src/lib/builder/formatToolResultForModel";
import { generateBuildingPreview } from "@/src/lib/builder/generateBuildingPreview";
import { planAndRefineBuildingPreview } from "@/src/lib/builder/planAndRefineBuildingPreview";
import { resolveReferenceBuildIntentAsync } from "@/src/lib/builder/reference/resolveReferenceBuildIntent";
import { shouldRunGenerationTool } from "@/src/lib/builder/shouldRunGenerationTool";
import {
  shouldRunRefinementTool,
  shouldStrongCreatePrompt,
} from "@/src/lib/builder/shouldRunRefinementTool";

export function lastUserMessageText(
  messages: readonly BuilderChatMessageInput[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user") return m.content;
  }
  return "";
}

export function shouldUseRefinementJsonTurn(
  messages: readonly BuilderChatMessageInput[],
  currentBlueprint: BuilderBlueprint | null,
  attachments: readonly BuilderImageAttachmentInput[],
): boolean {
  return shouldRunRefinementTool(
    lastUserMessageText(messages),
    currentBlueprint != null,
    hasImageAttachments(attachments),
  );
}

export function shouldUseGenerationJsonTurn(
  messages: readonly BuilderChatMessageInput[],
  currentBlueprint: BuilderBlueprint | null,
  attachments: readonly BuilderImageAttachmentInput[],
): boolean {
  const text = lastUserMessageText(messages);
  if (!shouldRunGenerationTool(text, hasImageAttachments(attachments))) {
    return false;
  }
  if (currentBlueprint == null) {
    return true;
  }
  return shouldStrongCreatePrompt(text);
}

function augmentMessagesWithToolResult(
  messages: readonly BuilderChatMessageInput[],
  toolNote: string,
): BuilderChatMessageInput[] {
  if (messages.length === 0) return [...messages];
  const last = messages[messages.length - 1]!;
  if (last.role !== "user") {
    return [
      ...messages,
      { role: "user", content: `[Server builder tool result]\n${toolNote}` },
    ];
  }
  return [
    ...messages.slice(0, -1),
    {
      role: "user",
      content: `${last.content}\n\n[Server builder tool result]\n${toolNote}`,
    },
  ];
}

async function runToolChatTurn(
  messages: readonly BuilderChatMessageInput[],
  attachments: readonly BuilderImageAttachmentInput[],
  toolResult: BuilderToolResult,
): Promise<
  | { ok: true; payload: BuilderChatToolSuccessResponse }
  | { ok: false; error: string; code: "CONFIG" | "UPSTREAM" | "LICENSE"; upstreamStatus?: number }
> {
  const augmented = augmentMessagesWithToolResult(
    messages,
    formatToolResultForModel(toolResult),
  );
  // Tool result already summarizes the build; narration is text-only.
  const aiResult = await callWorkersAiChat(augmented, []);
  if (!aiResult.ok) return aiResult;
  return {
    ok: true,
    payload: { message: aiResult.message, model: aiResult.model, toolResult },
  };
}

export async function runBuilderGenerationChatTurn(
  messages: readonly BuilderChatMessageInput[],
  attachments: readonly BuilderImageAttachmentInput[],
): Promise<
  | { ok: true; payload: BuilderChatToolSuccessResponse }
  | { ok: false; error: string; code: "CONFIG" | "UPSTREAM" | "LICENSE"; upstreamStatus?: number }
> {
  const prompt = lastUserMessageText(messages);
  const hasImage = hasImageAttachments(attachments);

  // Vision extraction runs whenever images are present — the resolver handles
  // fallback to text inference and the generic landmark default.
  const resolvedIntent = hasImage
    ? await resolveReferenceBuildIntentAsync(prompt, attachments)
    : null;

  const toolResult = generateBuildingPreview(
    { prompt, mode: "create_from_prompt" },
    { hasImage, resolvedIntent: resolvedIntent ?? undefined },
  );
  return runToolChatTurn(messages, attachments, toolResult);
}

export async function runBuilderRefinementChatTurn(
  messages: readonly BuilderChatMessageInput[],
  attachments: readonly BuilderImageAttachmentInput[],
  currentBlueprint: BuilderBlueprint,
): Promise<
  | { ok: true; payload: BuilderChatToolSuccessResponse }
  | { ok: false; error: string; code: "CONFIG" | "UPSTREAM" | "LICENSE"; upstreamStatus?: number }
> {
  const prompt = lastUserMessageText(messages);
  const toolResult = await planAndRefineBuildingPreview({
    prompt,
    blueprint: currentBlueprint,
    plannerMode: "auto",
  });
  return runToolChatTurn(messages, attachments, toolResult);
}
