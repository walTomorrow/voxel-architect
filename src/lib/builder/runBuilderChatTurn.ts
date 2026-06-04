import { callWorkersAiChat } from "@/src/lib/builder/callWorkersAiChat";
import type {
  BuilderChatMessageInput,
  BuilderImageAttachmentInput,
} from "@/src/lib/builder/builderChatTypes";
import type { BuilderChatToolSuccessResponse } from "@/src/lib/builder/builderToolTypes";
import { formatToolResultForModel } from "@/src/lib/builder/formatToolResultForModel";
import { generateBuildingPreview } from "@/src/lib/builder/generateBuildingPreview";
import { shouldRunGenerationTool } from "@/src/lib/builder/shouldRunGenerationTool";

export type RunBuilderChatTurnResult =
  | { kind: "stream" }
  | { kind: "json_with_tool"; payload: BuilderChatToolSuccessResponse }
  | { kind: "json_chat"; payload: { message: string; model: string } };

export function lastUserMessageText(
  messages: readonly BuilderChatMessageInput[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user") return m.content;
  }
  return "";
}

export function shouldUseGenerationJsonTurn(
  messages: readonly BuilderChatMessageInput[],
  attachment: BuilderImageAttachmentInput | null,
): boolean {
  return shouldRunGenerationTool(
    lastUserMessageText(messages),
    attachment != null,
  );
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
