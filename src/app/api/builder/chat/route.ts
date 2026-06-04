import {
  builderChatSseHeaders,
  callWorkersAiChat,
  shouldStreamBuilderChat,
  sseErrorStream,
  streamWorkersAiChat,
} from "@/src/lib/builder/callWorkersAiChat";
import type { BuilderChatErrorResponse, BuilderChatSuccessResponse } from "@/src/lib/builder/builderChatTypes";
import { parseBuilderChatRequestBody } from "@/src/lib/builder/validateChatRequest";

export const runtime = "edge";

const MAX_BODY_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const contentLength = request.headers.get("content-length");
  if (contentLength != null) {
    const len = Number.parseInt(contentLength, 10);
    if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
      return jsonError("Request body is too large.", "VALIDATION", 413);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", "VALIDATION", 400);
  }

  const parsed = parseBuilderChatRequestBody(body);
  if (!parsed.ok) {
    return jsonError(parsed.error, "VALIDATION", 400);
  }

  const { messages, attachment } = parsed.data;

  if (shouldStreamBuilderChat(attachment)) {
    const streamResult = await streamWorkersAiChat(messages);
    if (!streamResult.ok) {
      const status = upstreamHttpStatus(streamResult);
      return new Response(
        sseErrorStream(streamResult.error, streamResult.code),
        { status, headers: builderChatSseHeaders("") },
      );
    }

    return new Response(streamResult.stream, {
      headers: builderChatSseHeaders(streamResult.model),
    });
  }

  const result = await callWorkersAiChat(messages, attachment);
  if (!result.ok) {
    const status = upstreamHttpStatus(result);
    return jsonError(result.error, result.code, status);
  }

  const payload: BuilderChatSuccessResponse = {
    message: result.message,
    model: result.model,
  };
  return Response.json(payload, {
    headers: { "X-Builder-Chat-Mode": "json" },
  });
}

function upstreamHttpStatus(
  result: { code: string; upstreamStatus?: number },
): number {
  if (result.code === "CONFIG") return 503;
  if (result.code === "LICENSE") return 403;
  const upstream = result.upstreamStatus;
  if (upstream === 429) return 429;
  if (upstream === 400) return 400;
  if (upstream === 401 || upstream === 403) return 502;
  return 502;
}

function jsonError(
  error: string,
  code: BuilderChatErrorResponse["code"],
  status: number,
): Response {
  const payload: BuilderChatErrorResponse = { error, code };
  return Response.json(payload, { status });
}
