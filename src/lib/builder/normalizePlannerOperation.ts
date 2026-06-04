function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const ROOM_PATCH_KEYS = ["width", "depth", "wallHeight"] as const;
const ROOF_PATCH_KEYS = ["kind", "layers", "overhang", "orientation"] as const;
const WINDOW_PATCH_KEYS = ["count", "layout"] as const;
const PORCH_PATCH_KEYS = ["depth"] as const;
const CHIMNEY_PATCH_KEYS = ["targetFace", "placementHorizontal"] as const;

const PATCH_KEYS_BY_COMPONENT: Record<string, readonly string[]> = {
  room: ROOM_PATCH_KEYS,
  roof: ROOF_PATCH_KEYS,
  window_group: WINDOW_PATCH_KEYS,
  porch: PORCH_PATCH_KEYS,
  chimney: CHIMNEY_PATCH_KEYS,
};

function hoistPatchFields(
  raw: Record<string, unknown>,
  componentType: string | undefined,
): Record<string, unknown> | null {
  const keys = componentType ? PATCH_KEYS_BY_COMPONENT[componentType] : undefined;
  if (!keys) return null;
  const hoisted: Record<string, unknown> = {};
  for (const key of keys) {
    if (raw[key] !== undefined) hoisted[key] = raw[key];
  }
  return Object.keys(hoisted).length > 0 ? hoisted : null;
}

function normalizePatch(
  patch: unknown,
  componentType: string | undefined,
  raw: Record<string, unknown>,
): unknown {
  let p = patch;
  if (!isRecord(p)) {
    p = hoistPatchFields(raw, componentType);
  }
  if (!isRecord(p) && componentType && isRecord(raw[componentType])) {
    p = { type: componentType, ...raw[componentType] };
  }
  if (!isRecord(p)) return p;

  if (componentType && p.type == null) {
    return { type: componentType, ...p };
  }
  if (componentType && isRecord(p[componentType])) {
    return { type: componentType, ...p[componentType] };
  }
  return p;
}

function normalizeOpName(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.op === "string") return raw.op;
  if (typeof raw.operation === "string") return raw.operation;
  if (
    typeof raw.type === "string" &&
    (raw.type === "setMaterialPalette" || raw.type === "updateComponent")
  ) {
    return raw.type;
  }
  return undefined;
}

function normalizeSetMaterialPalette(raw: Record<string, unknown>): Record<string, unknown> {
  const patch =
    raw.patch ??
    raw.materials ??
    raw.palette ??
    raw.changes ??
    hoistPatchFields(raw, undefined);
  return {
    op: "setMaterialPalette",
    patch: isRecord(patch) ? patch : {},
  };
}

function normalizeUpdateComponent(raw: Record<string, unknown>): Record<string, unknown> {
  const componentType =
    (typeof raw.componentType === "string" ? raw.componentType : undefined) ??
    (typeof raw.component_type === "string" ? raw.component_type : undefined) ??
    (typeof raw.type === "string" &&
    raw.type !== "updateComponent" &&
    PATCH_KEYS_BY_COMPONENT[raw.type]
      ? raw.type
      : undefined);

  const id =
    (typeof raw.id === "string" ? raw.id : undefined) ??
    (typeof raw.componentId === "string" ? raw.componentId : undefined) ??
    (typeof raw.component_id === "string" ? raw.component_id : undefined) ??
    (typeof raw.component === "string" ? raw.component : undefined);

  const patch = normalizePatch(
    raw.patch ?? raw.changes ?? raw.update ?? raw.fields,
    componentType,
    raw,
  );

  return {
    op: "updateComponent",
    id,
    componentType,
    patch,
  };
}

/**
 * Coerce common LLM planner operation shapes into canonical op objects before validation.
 */
export function normalizePlannerOperation(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const wrappedKey = Object.keys(raw).find(
    (k) => k === "setMaterialPalette" || k === "updateComponent",
  );
  if (wrappedKey && isRecord(raw[wrappedKey])) {
    return normalizePlannerOperation({ op: wrappedKey, ...raw[wrappedKey] });
  }

  const op = normalizeOpName(raw);
  if (op === "setMaterialPalette") return normalizeSetMaterialPalette(raw);
  if (op === "updateComponent") return normalizeUpdateComponent(raw);
  return raw;
}

export function normalizePlannerOperations(operations: readonly unknown[]): unknown[] {
  return operations.map((op) => normalizePlannerOperation(op));
}
