import {
  BUILDER_MAX_CHAT_MESSAGES,
  BUILDER_MAX_MESSAGE_CHARS,
  BUILDER_MAX_TOTAL_TEXT_CHARS,
  type BuilderChatMessageInput,
  type BuilderChatRole,
} from "@/src/lib/builder/builderChatTypes";

export type BuilderChatMessageLike = {
  readonly role: BuilderChatRole;
  readonly content: string;
};

export function totalTextChars(messages: readonly BuilderChatMessageLike[]): number {
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

/** Trim history and enforce dev payload limits before calling the API. */
export function prepareMessagesForChatApi(
  messages: readonly BuilderChatMessageLike[],
): { ok: true; messages: BuilderChatMessageInput[] } | { ok: false; error: string } {
  const trimmed = messages.slice(-BUILDER_MAX_CHAT_MESSAGES);
  if (trimmed.length === 0) {
    return { ok: false, error: "At least one message is required." };
  }

  for (const m of trimmed) {
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, error: "Message role must be user or assistant." };
    }
    if (m.content.trim().length === 0) {
      return { ok: false, error: "Message content must be a non-empty string." };
    }
    if (m.content.length > BUILDER_MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        error: `A message exceeds ${BUILDER_MAX_MESSAGE_CHARS} characters.`,
      };
    }
  }

  const chars = totalTextChars(trimmed);
  if (chars > BUILDER_MAX_TOTAL_TEXT_CHARS) {
    return {
      ok: false,
      error: `Conversation text is too long (${chars} characters, max ${BUILDER_MAX_TOTAL_TEXT_CHARS}). Reset the chat or start a new build.`,
    };
  }

  return {
    ok: true,
    messages: trimmed.map((m) => ({
      role: m.role,
      content: m.content.trim(),
    })),
  };
}

export function friendlyWorkersAiError(status: number): string {
  if (status === 429) {
    return "Workers AI is rate-limited right now. Wait a moment and try again.";
  }
  if (status === 401) {
    return "Workers AI rejected the API token. Check CLOUDFLARE_API_TOKEN.";
  }
  if (status === 403) {
    return "Workers AI rejected this request. Check account access or model license.";
  }
  if (status === 400) {
    return "Workers AI rejected this request. Check the model name, message format, or image attachment.";
  }
  if (status >= 500) {
    return "Workers AI had a temporary server error. Try again shortly.";
  }
  return "Workers AI returned an error. Try again in a moment.";
}
