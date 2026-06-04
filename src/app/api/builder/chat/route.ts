import { applyChatOnlyResponseSafety } from "@/src/lib/builder/applyChatOnlyResponseSafety";
import {
  builderChatSseHeaders,
  callWorkersAiChat,
  shouldStreamBuilderChat,
  sseErrorStream,
  streamWorkersAiChat,
} from "@/src/lib/builder/callWorkersAiChat";

import type {

  BuilderChatErrorResponse,

  BuilderChatSuccessResponse,

  BuilderChatWithToolSuccessResponse,

} from "@/src/lib/builder/builderChatTypes";

import { parseBuilderChatRequestBody } from "@/src/lib/builder/validateChatRequest";

import {

  runBuilderGenerationChatTurn,

  runBuilderRefinementChatTurn,

  shouldUseGenerationJsonTurn,

  shouldUseRefinementJsonTurn,

} from "@/src/lib/builder/runBuilderChatTurn";



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



  const { messages, attachment, currentBlueprint, currentBlockCount } = parsed.data;

  const chatAiContext = {
    currentBlueprint,
    ...(currentBlockCount != null ? { currentBlockCount } : {}),
  };



  if (

    shouldUseRefinementJsonTurn(messages, currentBlueprint, attachment) &&

    currentBlueprint != null

  ) {

    const turn = await runBuilderRefinementChatTurn(

      messages,

      attachment,

      currentBlueprint,

    );

    if (!turn.ok) {

      const status = upstreamHttpStatus(turn);

      return jsonError(turn.error, turn.code, status);

    }

    const payload: BuilderChatWithToolSuccessResponse = turn.payload;

    return Response.json(payload, {

      headers: {

        "X-Builder-Chat-Mode": "json",

        "X-Builder-Tool-Ran": "true",

        "X-Builder-Tool-Kind": "refine",

      },

    });

  }



  if (shouldUseGenerationJsonTurn(messages, currentBlueprint, attachment)) {

    const turn = await runBuilderGenerationChatTurn(messages, attachment);

    if (!turn.ok) {

      const status = upstreamHttpStatus(turn);

      return jsonError(turn.error, turn.code, status);

    }

    const payload: BuilderChatWithToolSuccessResponse = turn.payload;

    return Response.json(payload, {

      headers: {

        "X-Builder-Chat-Mode": "json",

        "X-Builder-Tool-Ran": "true",

        "X-Builder-Tool-Kind": "generate",

      },

    });

  }



  if (shouldStreamBuilderChat(attachment)) {

    const streamResult = await streamWorkersAiChat(messages, chatAiContext);

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



  const result = await callWorkersAiChat(messages, attachment, chatAiContext);

  if (!result.ok) {

    const status = upstreamHttpStatus(result);

    return jsonError(result.error, result.code, status);

  }

  const safe = applyChatOnlyResponseSafety({
    assistantText: result.message,
    hasToolResult: false,
    hasActiveBlueprint: currentBlueprint != null,
  });

  const payload: BuilderChatSuccessResponse = {

    message: safe.text,

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


