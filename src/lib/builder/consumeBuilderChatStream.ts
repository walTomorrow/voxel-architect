import type { BuilderChatErrorCode } from "@/src/lib/builder/builderChatTypes";

export type BuilderStreamCallbacks = {
  readonly onChunk: (text: string) => void;
  readonly onDone: (model: string, finalText?: string, guarded?: boolean) => void;
  readonly onError: (error: string, code: BuilderChatErrorCode) => void;
};

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  if (!data) return null;
  return { event, data };
}

export async function consumeBuilderChatSse(
  response: Response,
  callbacks: BuilderStreamCallbacks,
): Promise<{ completed: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response stream from server.", "UPSTREAM");
    return { completed: false };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const parsed = parseSseBlock(block);
      if (!parsed) continue;
      try {
        const json = JSON.parse(parsed.data) as Record<string, unknown>;
        if (parsed.event === "chunk" && typeof json.text === "string") {
          callbacks.onChunk(json.text);
        } else if (parsed.event === "done" && typeof json.model === "string") {
          completed = true;
          const finalText = typeof json.text === "string" ? json.text : undefined;
          const guarded = json.guarded === true;
          callbacks.onDone(json.model, finalText, guarded);
        } else if (parsed.event === "error" && typeof json.error === "string") {
          const code =
            typeof json.code === "string" &&
            (json.code === "CONFIG" ||
              json.code === "UPSTREAM" ||
              json.code === "LICENSE" ||
              json.code === "VALIDATION")
              ? json.code
              : "UPSTREAM";
          callbacks.onError(json.error, code);
        }
      } catch {
        /* skip malformed block */
      }
    }
  }

  return { completed };
}
