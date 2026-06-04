import { friendlyWorkersAiError } from "@/src/lib/builder/builderChatGuardrails";
import { buildBuilderSystemPromptWithContext } from "@/src/lib/builder/augmentChatWithBuildContext";
import {
  encodeBuilderChatSse,
  transformWorkersAiStreamToBuilderSse,
} from "@/src/lib/builder/workersAiSse";
import type {
  BuilderChatMessageInput,
  BuilderImageAttachmentInput,
} from "@/src/lib/builder/builderChatTypes";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import { extractWorkersAiResponseText } from "@/src/lib/builder/workersAiResponseExtract";
import { applyChatOnlyResponseSafety } from "@/src/lib/builder/applyChatOnlyResponseSafety";

const DEFAULT_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_TOKENS = 1024;

export type BuilderChatAiContext = {
  readonly currentBlueprint?: GenericBuildingBlueprintV2 | null;
  readonly presetId?: string;
  readonly currentBlockCount?: number;
};

type WorkersAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CloudflareAiEnvelope = {
  success?: boolean;
  result?: { response?: string } | string | null;
  errors?: Array<{ message?: string; code?: number }>;
};

export type CallWorkersAiResult =
  | { ok: true; message: string; model: string }
  | {
      ok: false;
      code: "CONFIG" | "UPSTREAM" | "LICENSE";
      error: string;
      upstreamStatus?: number;
    };

export type StreamWorkersAiResult =
  | { ok: true; stream: ReadableStream<Uint8Array>; model: string }
  | Extract<CallWorkersAiResult, { ok: false }>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeModelId(raw: string | undefined): string {
  const trimmed = (raw ?? DEFAULT_MODEL).trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : DEFAULT_MODEL;
}

export function getWorkersAiConfig(): {
  accountId: string;
  apiToken: string;
  model: string;
} | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const model = normalizeModelId(process.env.WORKERS_AI_MODEL);
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken, model };
}

/** Model id must stay literal in the path (do not encode `@` or `/`). */
export function workersAiRunUrl(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

function buildChatMessages(
  history: readonly BuilderChatMessageInput[],
  context?: BuilderChatAiContext,
): WorkersAiChatMessage[] {
  return [
    {
      role: "system",
      content: buildBuilderSystemPromptWithContext(context?.currentBlueprint, {
        presetId: context?.presetId,
        generatedBlockCount: context?.currentBlockCount,
      }),
    },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];
}

export function buildRequestBody(
  history: readonly BuilderChatMessageInput[],
  attachment: BuilderImageAttachmentInput | null,
  stream: boolean,
  context?: BuilderChatAiContext,
): Record<string, unknown> {
  const messages = buildChatMessages(history, context);
  const body: Record<string, unknown> = { messages, max_tokens: MAX_TOKENS, stream };
  if (attachment) {
    body.image = `data:${attachment.mimeType};base64,${attachment.dataBase64}`;
  }
  return body;
}

/** Text-only requests use streaming; image requests use sync (vision streaming not relied on). */
export function shouldStreamBuilderChat(
  attachment: BuilderImageAttachmentInput | null,
): boolean {
  return attachment == null;
}

function extractAssistantText(json: CloudflareAiEnvelope, rawBodyLength = 0): string | null {
  return extractWorkersAiResponseText(json, 200, rawBodyLength).text;
}

function collectErrorMessages(json: CloudflareAiEnvelope, bodyText: string): string[] {
  const fromApi = (json.errors ?? [])
    .map((e) => e.message?.trim())
    .filter((m): m is string => Boolean(m));
  if (fromApi.length > 0) return fromApi;
  if (bodyText.trim().length > 0 && bodyText.length < 500) return [bodyText.trim()];
  return [];
}

function isLicenseAgreementAccepted(messages: readonly string[]): boolean {
  const combined = messages.join(" ").toLowerCase();
  return (
    combined.includes("thank you for agreeing") ||
    combined.includes("you may now use the model")
  );
}

function isLicenseError(messages: readonly string[], status: number): boolean {
  if (isLicenseAgreementAccepted(messages)) return false;
  const combined = messages.join(" ").toLowerCase();
  return (
    status === 403 ||
    combined.includes("model terms") ||
    combined.includes("model agreement") ||
    combined.includes("has not agreed") ||
    combined.includes("acceptable use")
  );
}

function mapUpstreamFailure(
  status: number,
  apiMessages: readonly string[],
): { code: "UPSTREAM" | "LICENSE"; error: string } {
  if (isLicenseError(apiMessages, status)) {
    return { code: "LICENSE", error: LICENSE_HINT };
  }

  const detail = apiMessages[0]?.slice(0, 240);
  if (detail) {
    const lower = detail.toLowerCase();
    if (lower.includes("no such model")) {
      return {
        code: "UPSTREAM",
        error:
          "Workers AI could not find the configured model. Check WORKERS_AI_MODEL is exactly @cf/meta/llama-3.2-11b-vision-instruct.",
      };
    }
    if (lower.includes("invalid data") || lower.includes("base64")) {
      return {
        code: "UPSTREAM",
        error: "Workers AI rejected the image data. Try another PNG, JPEG, or WebP file under 4 MB.",
      };
    }
    return {
      code: "UPSTREAM",
      error: `${friendlyWorkersAiError(status)} ${detail}`,
    };
  }

  return { code: "UPSTREAM", error: friendlyWorkersAiError(status) };
}

const LICENSE_HINT =
  "This model requires a one-time Meta license acceptance. Run: curl -X POST " +
  '"https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run/@cf/meta/llama-3.2-11b-vision-instruct" ' +
  '-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -d \'{"prompt":"agree"}\'';

function configError(): Extract<CallWorkersAiResult, { ok: false }> {
  return {
    ok: false,
    code: "CONFIG",
    error:
      "Workers AI is not configured on the server. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
  };
}

type WorkersAiFetchResult =
  | { response: Response }
  | Extract<CallWorkersAiResult, { ok: false }>;

async function fetchWorkersAi(
  config: { accountId: string; apiToken: string; model: string },
  body: Record<string, unknown>,
): Promise<WorkersAiFetchResult> {
  const url = workersAiRunUrl(config.accountId, config.model);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return { response };
  } catch {
    return {
      ok: false,
      code: "UPSTREAM",
      error: "Could not reach Workers AI. Check your network and try again.",
    };
  }
}

async function runWorkersAiSync(
  config: { accountId: string; apiToken: string; model: string },
  body: Record<string, unknown>,
): Promise<CallWorkersAiResult> {
  const fetched = await fetchWorkersAi(config, body);
  if (!("response" in fetched)) {
    return fetched;
  }
  const response = fetched.response;
  const rawText = await response.text();
    let json: CloudflareAiEnvelope = {};
    try {
      json = JSON.parse(rawText) as CloudflareAiEnvelope;
    } catch {
      /* non-JSON */
    }
    const apiMessages = collectErrorMessages(json, rawText);
    if (!response.ok || json.success === false) {
      const mapped = mapUpstreamFailure(response.status, apiMessages);
      return {
        ok: false,
        code: mapped.code,
        error: mapped.error,
        upstreamStatus: response.status,
      };
    }
    const message = extractAssistantText(json, rawText.length);
    if (!message) {
      const mapped = mapUpstreamFailure(response.status, apiMessages);
      return {
        ok: false,
        code: mapped.code,
        error: mapped.error || "Workers AI returned an empty response.",
        upstreamStatus: response.status,
      };
    }
  return { ok: true, message, model: config.model };
}

function sseErrorStream(
  error: string,
  code: "CONFIG" | "UPSTREAM" | "LICENSE",
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(encodeBuilderChatSse({ event: "error", error, code })),
      );
      controller.close();
    },
  });
}

export async function streamWorkersAiChat(
  history: readonly BuilderChatMessageInput[],
  context?: BuilderChatAiContext,
): Promise<StreamWorkersAiResult> {
  const config = getWorkersAiConfig();
  if (!config) return configError();

  const body = buildRequestBody(history, null, true, context);
  const fetched = await fetchWorkersAi(config, body);
  if (!("response" in fetched)) return fetched;
  const response = fetched.response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const rawText = await response.text();
      let json: CloudflareAiEnvelope = {};
      try {
        json = JSON.parse(rawText) as CloudflareAiEnvelope;
      } catch {
        /* ignore */
      }
      const mapped = mapUpstreamFailure(
        response.status,
        collectErrorMessages(json, rawText),
      );
    return {
      ok: false,
      code: mapped.code,
      error: mapped.error,
      upstreamStatus: response.status,
    };
  }

  if (!response.body) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: "Workers AI returned an empty stream.",
    };
  }

  if (contentType.includes("text/event-stream")) {
    return {
      ok: true,
      stream: transformWorkersAiStreamToBuilderSse(response.body, config.model, {
        hasActiveBlueprint: context?.currentBlueprint != null,
      }),
      model: config.model,
    };
  }

  const rawText = await response.text();
  let json: CloudflareAiEnvelope = {};
  try {
    json = JSON.parse(rawText) as CloudflareAiEnvelope;
  } catch {
    return {
      ok: false,
      code: "UPSTREAM",
      error: "Workers AI returned an unexpected response format.",
    };
  }
  const message = extractAssistantText(json, rawText.length);
  if (!message) {
    const mapped = mapUpstreamFailure(
      response.status,
      collectErrorMessages(json, rawText),
    );
    return {
      ok: false,
      code: mapped.code,
      error: mapped.error || "Workers AI returned an empty response.",
      upstreamStatus: response.status,
    };
  }
  const encoder = new TextEncoder();
  const safe = applyChatOnlyResponseSafety({
    assistantText: message,
    hasToolResult: false,
    hasActiveBlueprint: context?.currentBlueprint != null,
  });
  const fallback = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(encodeBuilderChatSse({ event: "chunk", text: message })),
      );
      controller.enqueue(
        encoder.encode(
          encodeBuilderChatSse({
            event: "done",
            model: config.model,
            text: safe.text,
            guarded: safe.guarded,
          }),
        ),
      );
      controller.close();
    },
  });
  return { ok: true, stream: fallback, model: config.model };
}

export async function callWorkersAiChat(
  history: readonly BuilderChatMessageInput[],
  attachment: BuilderImageAttachmentInput | null,
  context?: BuilderChatAiContext,
): Promise<CallWorkersAiResult> {
  const config = getWorkersAiConfig();
  if (!config) return configError();

  const body = buildRequestBody(history, attachment, false, context);
  return runWorkersAiSync(config, body);
}

export function builderChatSseHeaders(model: string): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Builder-Chat-Mode": "stream",
    "X-Builder-Model": model,
  };
}

export { sseErrorStream };
