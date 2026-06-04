import { getWorkersAiConfig, workersAiRunUrl } from "@/src/lib/builder/callWorkersAiChat";
import { PLANNER_SYSTEM_PROMPT } from "@/src/lib/builder/buildPlannerPrompt";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import { parsePlannerJsonResponse } from "@/src/lib/builder/validatePlannerOperations";
import type { PlannerJsonResponse } from "@/src/lib/builder/plannerTypes";
import { buildWorkersAiPlannerResponseFormat } from "@/src/lib/builder/plannerResponseSchema";
import {
  classifyEmptyWorkersAiExtract,
  extractWorkersAiResponseText,
  formatWorkersAiExtractDiagnostics,
  type WorkersAiExtractDiagnostics,
} from "@/src/lib/builder/workersAiResponseExtract";

const PLANNER_MAX_TOKENS = 768;

export type PlannerUpstreamDiagnostics = {
  readonly model: string;
  readonly requestMode: "planner";
  readonly rejectionCategory?: PlannerRejectionCode;
  readonly summary: string;
  readonly extract: WorkersAiExtractDiagnostics;
};

import { isBuilderDevMode } from "@/src/lib/builder/builderDevMode";

function logPlannerDev(message: string): void {
  if (isBuilderDevMode()) {
    console.info(`[builder-planner] ${message}`);
  }
}

export type CallJsonPlannerResult =
  | { ok: true; rawText: string; model: string }
  | {
      ok: false;
      code: "CONFIG" | "UPSTREAM" | "PARSE";
      error: string;
      upstreamStatus?: number;
      rejectionCode: PlannerRejectionCode;
      diagnostics?: PlannerUpstreamDiagnostics;
    };

function isJsonModeFailureMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("json mode") && (m.includes("couldn't be met") || m.includes("could not be met"));
}

/**
 * POST to Workers AI with JSON Mode (`response_format.type = "json_schema"`).
 * Schema from `buildWorkersAiPlannerResponseFormat()` — see plannerResponseSchema.ts.
 */
export async function fetchPlannerText(
  userPrompt: string,
  systemContent?: string,
): Promise<CallJsonPlannerResult> {
  const config = getWorkersAiConfig();
  if (!config) {
    return {
      ok: false,
      code: "CONFIG",
      error:
        "Workers AI is not configured on the server. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      rejectionCode: "PLANNER_UPSTREAM",
    };
  }

  const system = systemContent ?? PLANNER_SYSTEM_PROMPT;

  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    max_tokens: PLANNER_MAX_TOKENS,
    stream: false,
    response_format: buildWorkersAiPlannerResponseFormat(),
  };

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
    const rawBody = await response.text();
    let envelope: unknown = {};
    try {
      envelope = JSON.parse(rawBody) as unknown;
    } catch {
      /* non-JSON */
    }

    const apiFailed =
      typeof envelope === "object" &&
      envelope != null &&
      "success" in envelope &&
      (envelope as { success?: boolean }).success === false;

    if (!response.ok || apiFailed) {
      const errors =
        typeof envelope === "object" &&
        envelope != null &&
        "errors" in envelope &&
        Array.isArray((envelope as { errors?: unknown }).errors)
          ? (envelope as { errors: Array<{ message?: string }> }).errors
          : [];
      const msg =
        errors[0]?.message?.trim() ||
        (rawBody.length < 500 ? rawBody.trim() : "") ||
        "Workers AI planner request failed.";

      logPlannerDev(
        formatWorkersAiExtractDiagnostics(config.model, "planner", {
          httpStatus: response.status,
          apiSuccess: false,
          resultType: "error",
          resultFieldNames: [],
          topLevelFieldNames: [],
          extractedLength: 0,
          hadText: false,
          extractPath: null,
          rawBodyLength: rawBody.length,
        }) + `; upstreamError=${msg.slice(0, 120)}`,
      );

      const rejectionCode: PlannerRejectionCode = isJsonModeFailureMessage(msg)
        ? "JSON_MODE_FAILED"
        : "PLANNER_UPSTREAM";

      return {
        ok: false,
        code: "UPSTREAM",
        error: isJsonModeFailureMessage(msg)
          ? "Workers AI JSON Mode could not produce a response matching the planner schema."
          : msg,
        upstreamStatus: response.status,
        rejectionCode,
      };
    }

    const extracted = extractWorkersAiResponseText(envelope, response.status, rawBody.length);
    logPlannerDev(formatWorkersAiExtractDiagnostics(config.model, "planner", extracted.diagnostics));

    if (!extracted.text) {
      const rejectionCode = classifyEmptyWorkersAiExtract(extracted.diagnostics);
      const error =
        rejectionCode === "UNEXPECTED_RESPONSE_SHAPE"
          ? "Workers AI returned an unexpected planner response shape."
          : "Workers AI returned empty planner output from the model.";
      return {
        ok: false,
        code: "UPSTREAM",
        error,
        upstreamStatus: response.status,
        rejectionCode,
        diagnostics: {
          model: config.model,
          requestMode: "planner",
          rejectionCategory: rejectionCode,
          summary: formatWorkersAiExtractDiagnostics(config.model, "planner", extracted.diagnostics),
          extract: extracted.diagnostics,
        },
      };
    }

    return { ok: true, rawText: extracted.text, model: config.model };
  } catch {
    return {
      ok: false,
      code: "UPSTREAM",
      error: "Could not reach Workers AI for operation planning.",
      rejectionCode: "PLANNER_UPSTREAM",
    };
  }
}

export function parsePlannerRawText(
  rawText: string,
):
  | { ok: true; json: PlannerJsonResponse }
  | { ok: false; error: string; code: PlannerRejectionCode } {
  const parsed = parsePlannerJsonResponse(rawText);
  if ("error" in parsed) {
    return { ok: false, error: parsed.error, code: parsed.code };
  }
  return { ok: true, json: parsed };
}

/**
 * Fetch planner text and parse JSON. One repair attempt on parse failure (also uses JSON Mode).
 */
export async function callWorkersAiJsonPlanner(
  userPrompt: string,
  options?: { systemContent?: string },
): Promise<
  | { ok: true; json: PlannerJsonResponse; model: string; rawText: string }
  | {
      ok: false;
      error: string;
      code: "CONFIG" | "UPSTREAM" | "PARSE";
      rejectionCode: PlannerRejectionCode;
      diagnostics?: PlannerUpstreamDiagnostics;
      lastRawText?: string;
    }
> {
  const first = await fetchPlannerText(userPrompt, options?.systemContent);
  if (!first.ok) {
    return {
      ok: false,
      error: first.error,
      code: first.code === "PARSE" ? "PARSE" : first.code,
      rejectionCode: first.rejectionCode,
      diagnostics: first.diagnostics,
    };
  }

  let parsed = parsePlannerRawText(first.rawText);
  if (!parsed.ok) {
    logPlannerDev(`parseFailure=${parsed.code}; textLen=${first.rawText.length}`);
    const repair = await fetchPlannerText(
      userPrompt,
      options?.systemContent ??
        `${PLANNER_SYSTEM_PROMPT}\n\nYour previous response was invalid. Return only one valid JSON object. No markdown.`,
    );
    if (!repair.ok) {
      return {
        ok: false,
        error: `JSON parse failed: ${parsed.error}`,
        code: "PARSE",
        rejectionCode: parsed.code,
        lastRawText: first.rawText,
        diagnostics: repair.diagnostics,
      };
    }
    parsed = parsePlannerRawText(repair.rawText);
    if (!parsed.ok) {
      return {
        ok: false,
        error: `JSON parse failed: ${parsed.error}`,
        code: "PARSE",
        rejectionCode: parsed.code,
        lastRawText: repair.rawText,
      };
    }
    return { ok: true, json: parsed.json, model: repair.model, rawText: repair.rawText };
  }

  return { ok: true, json: parsed.json, model: first.model, rawText: first.rawText };
}
