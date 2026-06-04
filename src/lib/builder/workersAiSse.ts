import { applyChatOnlyResponseSafety } from "@/src/lib/builder/applyChatOnlyResponseSafety";

/** Our builder chat SSE events (server → browser). */
export type BuilderChatStreamEvent =
  | { readonly event: "chunk"; readonly text: string }
  | {
      readonly event: "done";
      readonly model: string;
      readonly text?: string;
      readonly guarded?: boolean;
    }
  | { readonly event: "error"; readonly error: string; readonly code: string };

export type BuilderStreamGuardOptions = {
  readonly hasActiveBlueprint?: boolean;
};

export function encodeBuilderChatSse(event: BuilderChatStreamEvent): string {
  const { event: name, ...data } = event;
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Parse one Workers AI SSE `data:` payload into incremental text, if any. */
export function extractWorkersAiStreamToken(data: string): string | null {
  const trimmed = data.trim();
  if (!trimmed || trimmed === "[DONE]") return null;
  try {
    const json = JSON.parse(trimmed) as { response?: unknown };
    const r = json.response;
    if (r == null) return null;
    if (typeof r === "string") return r;
    if (typeof r === "number" && Number.isFinite(r)) return String(r);
    return null;
  } catch {
    return null;
  }
}

/**
 * Transform Workers AI `text/event-stream` into builder chat SSE
 * (`chunk` / `done` / `error`).
 */
export function transformWorkersAiStreamToBuilderSse(
  upstream: ReadableStream<Uint8Array>,
  model: string,
  guardOptions?: BuilderStreamGuardOptions,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let lineBuffer = "";
  let accumulated = "";
  let doneEmitted = false;

  const emitDone = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (doneEmitted) return;
    doneEmitted = true;
    const safe = applyChatOnlyResponseSafety({
      assistantText: accumulated,
      hasToolResult: false,
      hasActiveBlueprint: guardOptions?.hasActiveBlueprint,
    });
    controller.enqueue(
      encoder.encode(
        encodeBuilderChatSse({
          event: "done",
          model,
          text: safe.text,
          guarded: safe.guarded,
        }),
      ),
    );
  };

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        lineBuffer += decoder.decode(chunk, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            emitDone(controller);
            continue;
          }
          const token = extractWorkersAiStreamToken(data);
          if (token) {
            accumulated += token;
            controller.enqueue(
              encoder.encode(encodeBuilderChatSse({ event: "chunk", text: token })),
            );
          }
        }
      },
      flush(controller) {
        if (lineBuffer.trim()) {
          const trimmed = lineBuffer.trim();
          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              emitDone(controller);
            } else {
              const token = extractWorkersAiStreamToken(data);
              if (token) {
                accumulated += token;
                controller.enqueue(
                  encoder.encode(
                    encodeBuilderChatSse({ event: "chunk", text: token }),
                  ),
                );
              }
            }
          }
        }
        if (!doneEmitted) {
          emitDone(controller);
        }
      },
    }),
  );
}
