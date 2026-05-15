/**
 * Structural checks for pasted medieval-tower blueprints before `validateBlueprint()`.
 * Ensures required keys exist with expected JSON types so the visualizer never receives
 * partial objects (e.g. `constraints.maxBlock` instead of `constraints.maxBlockCount`).
 */

type FieldSpec =
  | { readonly kind: "string" }
  | { readonly kind: "number" }
  | { readonly kind: "boolean" }
  | { readonly kind: "object"; readonly fields: Record<string, FieldSpec> };

/** Required shape for `MedievalTowerBlueprint` as used by `/visualizer` and `validateBlueprint()`. */
const MEDIEVAL_TOWER_IMPORT_SHAPE: Record<string, FieldSpec> = {
  metadata: {
    kind: "object",
    fields: {
      name: { kind: "string" },
    },
  },
  dimensions: {
    kind: "object",
    fields: {
      width: { kind: "number" },
      length: { kind: "number" },
      height: { kind: "number" },
    },
  },
  materials: {
    kind: "object",
    fields: {
      wall: { kind: "string" },
      floor: { kind: "string" },
      roof: { kind: "string" },
      window: { kind: "string" },
      door: { kind: "string" },
      accent: { kind: "string" },
    },
  },
  massing: {
    kind: "object",
    fields: {
      footprint: { kind: "string" },
      verticalEmphasis: { kind: "string" },
      symmetry: { kind: "string" },
      wallThickness: { kind: "number" },
      hollowInterior: { kind: "boolean" },
    },
  },
  levels: {
    kind: "object",
    fields: {
      floorCount: { kind: "number" },
      includeInteriorFloors: { kind: "boolean" },
    },
  },
  openings: {
    kind: "object",
    fields: {
      entranceSide: { kind: "string" },
      entranceStyle: { kind: "string" },
      entranceWidth: { kind: "number" },
      entranceHeight: { kind: "number" },
      windowsStyle: { kind: "string" },
      windowsPlacement: { kind: "string" },
      windowsFloors: { kind: "string" },
      windowsCountPerSide: { kind: "number" },
    },
  },
  roof: {
    kind: "object",
    fields: {
      style: { kind: "string" },
      height: { kind: "number" },
      overhang: { kind: "number" },
    },
  },
  features: {
    kind: "object",
    fields: {
      crenellations: { kind: "boolean" },
      cornerPillars: { kind: "boolean" },
    },
  },
  constraints: {
    kind: "object",
    fields: {
      maxBlockCount: { kind: "number" },
      allowFloatingBlocks: { kind: "boolean" },
      enforceSymmetry: { kind: "boolean" },
      requireGroundedStructure: { kind: "boolean" },
    },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkField(
  value: unknown,
  path: string,
  spec: FieldSpec,
): string | null {
  if (spec.kind === "object") {
    if (!isPlainObject(value)) {
      return `Missing or invalid blueprint field: ${path} (expected object).`;
    }
    for (const [key, child] of Object.entries(spec.fields)) {
      if (!(key in value)) {
        return `Missing required blueprint field: ${path}.${key}`;
      }
      const childPath = path ? `${path}.${key}` : key;
      const err = checkField(value[key], childPath, child);
      if (err) return err;
    }
    return null;
  }
  if (spec.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `Missing or invalid blueprint field: ${path} (expected number).`;
    }
    return null;
  }
  if (spec.kind === "boolean") {
    if (typeof value !== "boolean") {
      return `Missing or invalid blueprint field: ${path} (expected boolean).`;
    }
    return null;
  }
  if (typeof value !== "string") {
    return `Missing or invalid blueprint field: ${path} (expected string).`;
  }
  return null;
}

/**
 * Returns an error message when the object is not a complete medieval-tower blueprint
 * shape for import; `null` when all required fields are present with valid JSON types.
 * Extra unknown keys are allowed.
 */
export function validateImportedMedievalTowerStructure(
  raw: unknown,
): string | null {
  if (!isPlainObject(raw)) {
    return "blueprint must be a non-null object (not an array).";
  }
  for (const [key, spec] of Object.entries(MEDIEVAL_TOWER_IMPORT_SHAPE)) {
    if (!(key in raw)) {
      return `Missing required blueprint field: ${key}`;
    }
    const err = checkField(raw[key], key, spec);
    if (err) return err;
  }
  return null;
}
