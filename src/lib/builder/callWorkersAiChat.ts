import { friendlyWorkersAiError } from "@/src/lib/builder/builderChatGuardrails";

import { BUILDER_SYSTEM_PROMPT } from "@/src/lib/builder/builderSystemPrompt";

import type {

  BuilderChatMessageInput,

  BuilderImageAttachmentInput,

} from "@/src/lib/builder/builderChatTypes";



const DEFAULT_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const MAX_TOKENS = 1024;



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



function isRecord(v: unknown): v is Record<string, unknown> {

  return typeof v === "object" && v !== null;

}



function normalizeModelId(raw: string | undefined): string {

  const trimmed = (raw ?? DEFAULT_MODEL).trim().replace(/^["']|["']$/g, "");

  return trimmed.length > 0 ? trimmed : DEFAULT_MODEL;

}



function getWorkersAiConfig(): { accountId: string; apiToken: string; model: string } | null {

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

): WorkersAiChatMessage[] {

  return [

    { role: "system", content: BUILDER_SYSTEM_PROMPT },

    ...history.map((m) => ({ role: m.role, content: m.content })),

  ];

}



function buildRequestBody(

  history: readonly BuilderChatMessageInput[],

  attachment: BuilderImageAttachmentInput | null,

): Record<string, unknown> {

  const messages = buildChatMessages(history);

  const body: Record<string, unknown> = { messages, max_tokens: MAX_TOKENS };



  if (attachment) {

    body.image = `data:${attachment.mimeType};base64,${attachment.dataBase64}`;

  }



  return body;

}



function extractAssistantText(json: CloudflareAiEnvelope): string | null {

  const result = json.result;

  if (typeof result === "string" && result.trim().length > 0) {

    return result.trim();

  }

  if (isRecord(result) && typeof result.response === "string" && result.response.trim().length > 0) {

    return result.response.trim();

  }

  return null;

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



async function runWorkersAi(

  config: { accountId: string; apiToken: string; model: string },

  body: Record<string, unknown>,

): Promise<CallWorkersAiResult> {

  const url = workersAiRunUrl(config.accountId, config.model);



  let response: Response;

  try {

    response = await fetch(url, {

      method: "POST",

      headers: {

        Authorization: `Bearer ${config.apiToken}`,

        "Content-Type": "application/json",

      },

      body: JSON.stringify(body),

    });

  } catch {

    return {

      ok: false,

      code: "UPSTREAM",

      error: "Could not reach Workers AI. Check your network and try again.",

    };

  }



  const rawText = await response.text();

  let json: CloudflareAiEnvelope = {};

  try {

    json = JSON.parse(rawText) as CloudflareAiEnvelope;

  } catch {

    /* non-JSON body */

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



  const message = extractAssistantText(json);

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



export async function callWorkersAiChat(

  history: readonly BuilderChatMessageInput[],

  attachment: BuilderImageAttachmentInput | null,

): Promise<CallWorkersAiResult> {

  const config = getWorkersAiConfig();

  if (!config) {

    return {

      ok: false,

      code: "CONFIG",

      error:

        "Workers AI is not configured on the server. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",

    };

  }



  const body = buildRequestBody(history, attachment);

  return runWorkersAi(config, body);

}


