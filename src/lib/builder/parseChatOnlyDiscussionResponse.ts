export type ChatOnlyDiscussionParseResult = {
  readonly message: string;
  readonly parsed: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Best-effort parse for discussion-only chat JSON. Falls back to raw text.
 */
export function parseChatOnlyDiscussionResponse(raw: string): ChatOnlyDiscussionParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { message: trimmed, parsed: false };
  }

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!unfenced.startsWith("{")) {
    return { message: trimmed, parsed: false };
  }

  try {
    const parsed = JSON.parse(unfenced) as unknown;
    if (!isRecord(parsed)) return { message: trimmed, parsed: false };
    if (parsed.responseType !== "discussion") return { message: trimmed, parsed: false };
    if (typeof parsed.message !== "string" || parsed.message.trim().length === 0) {
      return { message: trimmed, parsed: false };
    }
    return { message: parsed.message.trim(), parsed: true };
  } catch {
    return { message: trimmed, parsed: false };
  }
}
