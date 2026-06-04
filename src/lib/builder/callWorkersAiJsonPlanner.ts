import { getWorkersAiConfig, workersAiRunUrl } from "@/src/lib/builder/callWorkersAiChat";
import { PLANNER_SYSTEM_PROMPT } from "@/src/lib/builder/buildPlannerPrompt";
import type { PlannerRejectionCode } from "@/src/lib/builder/plannerRejection";
import { parsePlannerJsonResponse } from "@/src/lib/builder/validatePlannerOperations";
import type { PlannerJsonResponse } from "@/src/lib/builder/plannerTypes";
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

const PLANNER_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["ok", "unsupported"] },
      operations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            op: { type: "string", enum: ["setMaterialPalette", "updateComponent"] },
            id: { type: "string" },
            componentType: { type: "string" },
            patch: { type: "object" },
          },
          required: ["op", "patch"],
        },
      },
      rationaleSummary: { type: "string" },
      unsupportedReason: { type: "string" },
    },
    required: ["status"],
  },
} as const;

async function fetchPlannerText(
  userPrompt: string,
  systemExtra?: string,
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

  const system = systemExtra
    ? `${PLANNER_SYSTEM_PROMPT}\n\n${systemExtra}`
    : PLANNER_SYSTEM_PROMPT;

  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    max_tokens: PLANNER_MAX_TOKENS,
    stream: false,
    response_format: PLANNER_RESPONSE_FORMAT,
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
      return {
        ok: false,
        code: "UPSTREAM",
        error: msg,
        upstreamStatus: response.status,
        rejectionCode: "PLANNER_UPSTREAM",
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

export async function callWorkersAiJsonPlanner(
  userPrompt: string,
): Promise<
  | { ok: true; json: PlannerJsonResponse; model: string }
  | {
      ok: false;
      error: string;
      code: "CONFIG" | "UPSTREAM" | "PARSE";
      rejectionCode: PlannerRejectionCode;
      diagnostics?: PlannerUpstreamDiagnostics;
    }
> {
  const first = await fetchPlannerText(userPrompt);
  if (!first.ok) {
    return {
      ok: false,
      error: first.error,
      code: first.code === "PARSE" ? "PARSE" : first.code,
      rejectionCode: first.rejectionCode,
      diagnostics: first.diagnostics,
    };
  }

  let parsed = parsePlannerJsonResponse(first.rawText);
  if ("error" in parsed) {
    logPlannerDev(`parseFailure=${parsed.code}; textLen=${first.rawText.length}`);
    const repair = await fetchPlannerText(
      userPrompt,
      "Your previous response was invalid JSON. Return only a single valid JSON object matching the required shape. No markdown.",
    );
    if (!repair.ok) {
      return {
        ok: false,
        error: `JSON parse failed: ${parsed.error}`,
        code: "PARSE",
        rejectionCode: parsed.code,
        diagnostics: repair.diagnostics ?? {
          model: first.model,
          requestMode: "planner",
          rejectionCategory: parsed.code,
          summary: `parseFailure=${parsed.code}; textLen=${first.rawText.length}`,
          extract: {
            httpStatus: 200,
            apiSuccess: true,
            resultType: "parsed",
            resultFieldNames: [],
            topLevelFieldNames: [],
            extractedLength: first.rawText.length,
            hadText: true,
            extractPath: "parsed",
            rawBodyLength: first.rawText.length,
          },
        },
      };
    }
    parsed = parsePlannerJsonResponse(repair.rawText);
    if ("error" in parsed) {
      return {
        ok: false,
        error: `JSON parse failed: ${parsed.error}`,
        code: "PARSE",
        rejectionCode: parsed.code,
      };
    }
  }

  return { ok: true, json: parsed, model: first.model };
}
