export type WorkersAiExtractDiagnostics = {
  readonly httpStatus: number;
  readonly apiSuccess: boolean | undefined;
  readonly resultType: string;
  readonly resultFieldNames: readonly string[];
  readonly topLevelFieldNames: readonly string[];
  readonly extractedLength: number;
  readonly hadText: boolean;
  readonly extractPath: string | null;
  readonly rawBodyLength: number;
};

export type WorkersAiExtractResult = {
  readonly text: string | null;
  readonly diagnostics: WorkersAiExtractDiagnostics;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function tryString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function tryJsonStringify(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return tryString(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value) || Array.isArray(value)) {
    try {
      const s = JSON.stringify(value);
      return s.length > 2 ? s : null;
    } catch {
      return null;
    }
  }
  return null;
}

function fieldNames(value: unknown): readonly string[] {
  if (!isRecord(value)) return [];
  return Object.keys(value).sort();
}

/**
 * Extract assistant/planner text from Cloudflare Workers AI REST envelopes.
 * Handles string `result`, `{ response }`, JSON-mode nested objects, and common aliases.
 */
export function extractWorkersAiResponseText(
  envelope: unknown,
  httpStatus: number,
  rawBodyLength: number,
): WorkersAiExtractResult {
  const topLevelFieldNames = isRecord(envelope) ? Object.keys(envelope).sort() : [];
  const apiSuccess =
    isRecord(envelope) && typeof envelope.success === "boolean" ? envelope.success : undefined;

  let extractPath: string | null = null;
  const output: { text: string | null } = { text: null };

  const attempt = (path: string, value: unknown): boolean => {
    const s = tryString(value);
    if (s) {
      output.text = s;
      extractPath = path;
      return true;
    }
    return false;
  };

  const attemptStructured = (path: string, value: unknown): boolean => {
    const s = tryJsonStringify(value);
    if (s) {
      output.text = s;
      extractPath = path;
      return true;
    }
    return false;
  };

  if (isRecord(envelope) && attempt("envelope.response", envelope.response)) {
    /* found top-level response */
  }

  const result: unknown = isRecord(envelope) ? envelope.result : undefined;

  if (!output.text && typeof result === "string") {
    attempt("result", result);
  }

  if (!output.text && isRecord(result)) {
    const response = result.response;
    if (typeof response === "string") {
      attempt("result.response", response);
    } else if (response != null && (isRecord(response) || Array.isArray(response))) {
      attemptStructured("result.response", response);
    }

    if (!output.text && attempt("result.output", result.output)) {
      /* alt field */
    } else if (!output.text && attempt("result.text", result.text)) {
      /* alt field */
    } else if (!output.text && attempt("result.generated_text", result.generated_text)) {
      /* alt field */
    } else if (!output.text && attempt("result.message", result.message)) {
      /* alt field */
    } else if (!output.text && Array.isArray(result.choices)) {
      const choice0 = result.choices[0];
      if (isRecord(choice0)) {
        const message = choice0.message;
        if (isRecord(message)) {
          attempt("result.choices[0].message.content", message.content);
        }
        if (!output.text) attempt("result.choices[0].text", choice0.text);
      }
    }
  }

  const resultType =
    result === undefined ? "undefined" : Array.isArray(result) ? "array" : typeof result;

  const text = output.text;
  const extractedLength = text !== null ? text.length : 0;

  return {
    text,
    diagnostics: {
      httpStatus,
      apiSuccess,
      resultType,
      resultFieldNames: fieldNames(result),
      topLevelFieldNames,
      extractedLength,
      hadText: extractedLength > 0,
      extractPath,
      rawBodyLength,
    },
  };
}

export function formatWorkersAiExtractDiagnostics(
  model: string,
  mode: string,
  diagnostics: WorkersAiExtractDiagnostics,
): string {
  return [
    `model=${model}`,
    `mode=${mode}`,
    `http=${diagnostics.httpStatus}`,
    `apiSuccess=${String(diagnostics.apiSuccess)}`,
    `resultType=${diagnostics.resultType}`,
    `resultFields=${diagnostics.resultFieldNames.join(",") || "none"}`,
    `topFields=${diagnostics.topLevelFieldNames.join(",") || "none"}`,
    `hadText=${diagnostics.hadText}`,
    `extractPath=${diagnostics.extractPath ?? "none"}`,
    `textLen=${diagnostics.extractedLength}`,
    `bodyLen=${diagnostics.rawBodyLength}`,
  ].join("; ");
}

export function classifyEmptyWorkersAiExtract(
  diagnostics: WorkersAiExtractDiagnostics,
): "EMPTY_MODEL_OUTPUT" | "UNEXPECTED_RESPONSE_SHAPE" {
  if (
    diagnostics.resultType === "undefined" ||
    (diagnostics.resultType === "object" && diagnostics.resultFieldNames.length === 0)
  ) {
    return "UNEXPECTED_RESPONSE_SHAPE";
  }
  if (diagnostics.resultFieldNames.length > 0 && !diagnostics.hadText) {
    return "UNEXPECTED_RESPONSE_SHAPE";
  }
  return "EMPTY_MODEL_OUTPUT";
}
