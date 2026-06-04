import { generateBuildingPreview } from "@/src/lib/builder/generateBuildingPreview";
import type { BuilderToolMode } from "@/src/lib/builder/builderToolTypes";

const MAX_BODY_BYTES = 64 * 1024;

type GenerateBody = {
  prompt?: unknown;
  mode?: unknown;
};

function parseMode(raw: unknown): BuilderToolMode {
  if (raw === "modify_current") return "modify_current";
  if (raw === "select_preset") return "select_preset";
  return "create_from_prompt";
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = request.headers.get("content-length");
  if (contentLength != null) {
    const len = Number.parseInt(contentLength, 10);
    if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
      return Response.json({ error: "Request body is too large." }, { status: 413 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { prompt, mode } = body as GenerateBody;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "prompt must be a non-empty string." }, { status: 400 });
  }

  const result = generateBuildingPreview({
    prompt: prompt.trim(),
    mode: parseMode(mode),
  });

  return Response.json({ toolResult: result }, { status: 200 });
}
