import { callWorkersAiChat } from "@/src/lib/builder/callWorkersAiChat";
import type {
  BuilderChatMessageInput,
  BuilderImageAttachmentInput,
} from "@/src/lib/builder/builderChatTypes";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  BuilderChatToolSuccessResponse,
  BuilderToolResult,
} from "@/src/lib/builder/builderToolTypes";
import { formatToolResultForModel } from "@/src/lib/builder/formatToolResultForModel";
import { generateBuildingPreview } from "@/src/lib/builder/generateBuildingPreview";
import { refineBuildingPreview } from "@/src/lib/builder/refineBuildingPreview";
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
  currentBlueprint: GenericBuildingBlueprintV2 | null,
  attachment: BuilderImageAttachmentInput | null,
): boolean {
  return shouldRunRefinementTool(
    lastUserMessageText(messages),
    currentBlueprint != null,
    attachment != null,
  );
}

export function shouldUseGenerationJsonTurn(
  messages: readonly BuilderChatMessageInput[],
  currentBlueprint: GenericBuildingBlueprintV2 | null,
  attachment: BuilderImageAttachmentInput | null,
): boolean {
  const text = lastUserMessageText(messages);
  if (!shouldRunGenerationTool(text, attachment != null)) {
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
      {
        role: "user",
        content: `[Server builder tool result]\n${toolNote}`,
      },
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
  attachment: BuilderImageAttachmentInput | null,
  toolResult: BuilderToolResult,
): Promise<
  | { ok: true; payload: BuilderChatToolSuccessResponse }
  | { ok: false; error: string; code: "CONFIG" | "UPSTREAM" | "LICENSE"; upstreamStatus?: number }
> {
  const augmented = augmentMessagesWithToolResult(
    messages,
    formatToolResultForModel(toolResult),
  );

  const aiResult = await callWorkersAiChat(augmented, attachment);
  if (!aiResult.ok) {
    return aiResult;
  }

  return {
    ok: true,
    payload: {
      message: aiResult.message,
      model: aiResult.model,
      toolResult,
    },
  };
}

export async function runBuilderGenerationChatTurn(
  messages: readonly BuilderChatMessageInput[],
  attachment: BuilderImageAttachmentInput | null,
): Promise<
  | { ok: true; payload: BuilderChatToolSuccessResponse }
  | { ok: false; error: string; code: "CONFIG" | "UPSTREAM" | "LICENSE"; upstreamStatus?: number }
> {
  const prompt = lastUserMessageText(messages);
  const toolResult = generateBuildingPreview({
    prompt,
    mode: "create_from_prompt",
  });
  return runToolChatTurn(messages, attachment, toolResult);
}

export async function runBuilderRefinementChatTurn(
  messages: readonly BuilderChatMessageInput[],
  attachment: BuilderImageAttachmentInput | null,
  currentBlueprint: GenericBuildingBlueprintV2,
): Promise<
  | { ok: true; payload: BuilderChatToolSuccessResponse }
  | { ok: false; error: string; code: "CONFIG" | "UPSTREAM" | "LICENSE"; upstreamStatus?: number }
> {
  const prompt = lastUserMessageText(messages);
  const toolResult = refineBuildingPreview({ prompt, blueprint: currentBlueprint });
  return runToolChatTurn(messages, attachment, toolResult);
}
