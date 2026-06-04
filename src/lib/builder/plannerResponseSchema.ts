/**
 * Strict JSON Schema for Workers AI planner responses.
 *
 * Cloudflare JSON Mode: pass as `response_format: { type: "json_schema", json_schema: <schema> }`
 * on the native `/ai/run/{model}` endpoint (non-streaming). See:
 * https://developers.cloudflare.com/workers-ai/features/json-mode/
 *
 * The schema is the JSON Schema object itself (not wrapped in OpenAI's `schema` + `name` unless
 * the API adds that layer — our run endpoint uses `json_schema` as the root schema document).
 */

const PALETTE_PATCH_SCHEMA = {
  type: "object",
  additionalProperties: { type: "string" },
} as const;

const PATCH_TYPE_ENUM = ["room", "roof", "window_group", "porch", "chimney"] as const;

const ROOM_PATCH_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["room"] },
    width: { type: "number" },
    depth: { type: "number" },
    wallHeight: { type: "number" },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

const ROOF_PATCH_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["roof"] },
    kind: { type: "string", enum: ["pitched_gable", "shed", "none"] },
    layers: { type: "number" },
    overhang: { type: "number" },
    orientation: { type: "string", enum: ["front_back", "left_right"] },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

const WINDOW_PATCH_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["window_group"] },
    count: { type: "number" },
    layout: { type: "string", enum: ["symmetric", "even"] },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

const PORCH_PATCH_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["porch"] },
    depth: { type: "number" },
    widthMode: { type: "string", enum: ["door_only", "full_facade"] },
    aroundDoor: { type: ["string", "null"] },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

const CHIMNEY_PATCH_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["chimney"] },
    targetFace: { type: "string", enum: ["front", "back", "left", "right", "roof"] },
    placementHorizontal: { type: "string", enum: ["left", "center", "right"] },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

/** Per-op shapes — no shared `required: ["op","patch"]` on all operations. */
export const PLANNER_OPERATION_JSON_SCHEMA_ONE_OF = [
  {
    type: "object",
    properties: {
      op: { type: "string", enum: ["setMaterialPalette"] },
      patch: PALETTE_PATCH_SCHEMA,
    },
    required: ["op", "patch"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      op: { type: "string", enum: ["updateComponent"] },
      id: { type: "string" },
      componentType: {
        type: "string",
        enum: ["room", "roof", "window_group", "porch", "chimney"],
      },
      patch: {
        oneOf: [
          ROOM_PATCH_SCHEMA,
          ROOF_PATCH_SCHEMA,
          WINDOW_PATCH_SCHEMA,
          PORCH_PATCH_SCHEMA,
          CHIMNEY_PATCH_SCHEMA,
        ],
      },
    },
    required: ["op", "id", "componentType", "patch"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      op: { type: "string", enum: ["addComponent"] },
      componentType: { type: "string", enum: ["porch", "chimney", "window_group"] },
      id: { type: "string" },
      targetSurface: { type: "string" },
      placement: { type: "string", enum: ["left", "center", "right"] },
      options: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["porch", "chimney", "window_group"] },
          depth: { type: "number" },
          widthMode: { type: "string", enum: ["door_only", "full_facade"] },
          count: { type: "number" },
          layout: { type: "string", enum: ["symmetric", "even"] },
          placementHorizontal: { type: "string", enum: ["left", "center", "right"] },
        },
        required: ["kind"],
        additionalProperties: false,
      },
    },
    required: ["op", "componentType"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      op: { type: "string", enum: ["removeComponent"] },
      id: { type: "string" },
    },
    required: ["op", "id"],
    additionalProperties: false,
  },
] as const;

export const PLANNER_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["ok", "unsupported"] },
    operations: {
      type: "array",
      items: { oneOf: PLANNER_OPERATION_JSON_SCHEMA_ONE_OF },
    },
    rationaleSummary: { type: "string" },
    unsupportedReason: { type: "string" },
  },
  required: ["status"],
  additionalProperties: false,
} as const;

/**
 * Workers AI `response_format` payload for planner calls (JSON Mode).
 */
export function buildWorkersAiPlannerResponseFormat(): {
  readonly type: "json_schema";
  readonly json_schema: typeof PLANNER_RESPONSE_JSON_SCHEMA;
} {
  return {
    type: "json_schema",
    json_schema: PLANNER_RESPONSE_JSON_SCHEMA,
  };
}

export function plannerResponseFormatUsesJsonSchema(): boolean {
  return true;
}
