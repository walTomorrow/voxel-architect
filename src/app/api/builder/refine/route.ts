import { planAndRefineBuildingPreview } from "@/src/lib/builder/planAndRefineBuildingPreview";
import { parseCurrentBlueprintV2 } from "@/src/lib/builder/parseCurrentBlueprint";
import type { PlannerMode } from "@/src/lib/builder/plannerTypes";

const MAX_BODY_BYTES = 512 * 1024;

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

  const { prompt, blueprint, plannerMode } = body as {
    prompt?: unknown;
    blueprint?: unknown;
    plannerMode?: unknown;
  };
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "prompt must be a non-empty string." }, { status: 400 });
  }

  let mode: PlannerMode = "auto";
  if (plannerMode != null) {
    if (plannerMode !== "auto" && plannerMode !== "deterministic" && plannerMode !== "llm") {
      return Response.json(
        { error: 'plannerMode must be "auto", "deterministic", or "llm".' },
        { status: 400 },
      );
    }
    mode = plannerMode;
  }

  const parsedBp = parseCurrentBlueprintV2(blueprint);
  if (!parsedBp.ok) {
    return Response.json({ error: parsedBp.error }, { status: 400 });
  }

  const toolResult = await planAndRefineBuildingPreview({
    prompt: prompt.trim(),
    blueprint: parsedBp.blueprint,
    plannerMode: mode,
  });

  return Response.json({ toolResult }, { status: 200 });
}
