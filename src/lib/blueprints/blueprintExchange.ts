import { validateImportedMedievalTowerStructure } from "./blueprintImportStructure";
import type { MedievalTowerBlueprint, StructureBlueprint } from "./types";
import { validateBlueprint } from "./validateBlueprint";

/** Discriminator for official Voxel Architect blueprint exchange files. */
export const VOXEL_ARCHITECT_BLUEPRINT_KIND = "voxel-architect-blueprint" as const;

/** Exchange envelope version (not app or generator version). Only `1` is supported for import. */
export const BLUEPRINT_EXCHANGE_SCHEMA_VERSION = 1 as const;

/** v1 envelope: wrapped JSON only; no optional top-level metadata in this version. */
export type BlueprintExchangeEnvelopeV1 = {
  readonly kind: typeof VOXEL_ARCHITECT_BLUEPRINT_KIND;
  readonly schemaVersion: typeof BLUEPRINT_EXCHANGE_SCHEMA_VERSION;
  readonly blueprint: MedievalTowerBlueprint;
};

export type ParseBlueprintExchangeSuccess = {
  readonly ok: true;
  readonly blueprint: MedievalTowerBlueprint;
};

export type ParseBlueprintExchangeFailure = {
  readonly ok: false;
  readonly error: string;
  /** Which validation layer failed (for logging / UI). */
  readonly stage:
    | "json"
    | "root"
    | "kind"
    | "schemaVersion"
    | "blueprint"
    | "structureType"
    | "validateBlueprint";
};

export type ParseBlueprintExchangeResult =
  | ParseBlueprintExchangeSuccess
  | ParseBlueprintExchangeFailure;

function failure(
  stage: ParseBlueprintExchangeFailure["stage"],
  error: string,
): ParseBlueprintExchangeFailure {
  return { ok: false, stage, error };
}

/**
 * Serializes a validated authoring blueprint into the official v1 wrapped JSON
 * (pretty-printed, two-space indent).
 */
export function serializeBlueprintExchange(
  blueprint: MedievalTowerBlueprint,
): string {
  const envelope: BlueprintExchangeEnvelopeV1 = {
    kind: VOXEL_ARCHITECT_BLUEPRINT_KIND,
    schemaVersion: BLUEPRINT_EXCHANGE_SCHEMA_VERSION,
    blueprint,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Parses and validates wrapped exchange JSON. Does not throw on invalid input.
 * On success, `validateBlueprint()` has passed for the inner blueprint.
 */
export function parseBlueprintExchange(
  text: string,
): ParseBlueprintExchangeResult {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return failure("json", "Invalid JSON.");
  }

  if (root === null || typeof root !== "object" || Array.isArray(root)) {
    return failure("root", "Root value must be a plain object.");
  }

  const o = root as Record<string, unknown>;

  if (o.kind !== VOXEL_ARCHITECT_BLUEPRINT_KIND) {
    return failure(
      "kind",
      `Invalid kind: expected "${VOXEL_ARCHITECT_BLUEPRINT_KIND}".`,
    );
  }

  if (o.schemaVersion !== BLUEPRINT_EXCHANGE_SCHEMA_VERSION) {
    return failure(
      "schemaVersion",
      `Unsupported schemaVersion: expected the number ${BLUEPRINT_EXCHANGE_SCHEMA_VERSION}.`,
    );
  }

  if (!("blueprint" in o)) {
    return failure("blueprint", "Missing blueprint property.");
  }

  const rawBp = o.blueprint;
  if (rawBp === null || typeof rawBp !== "object" || Array.isArray(rawBp)) {
    return failure(
      "blueprint",
      "blueprint must be a non-null object (not an array).",
    );
  }

  const bpObj = rawBp as Record<string, unknown>;
  if (bpObj.structureType !== "medieval_tower") {
    return failure(
      "structureType",
      `Unsupported blueprint.structureType: expected "medieval_tower".`,
    );
  }

  const structureError = validateImportedMedievalTowerStructure(rawBp);
  if (structureError) {
    return failure("blueprint", structureError);
  }

  const blueprint = rawBp as MedievalTowerBlueprint;
  try {
    const validation = validateBlueprint(blueprint);
    if (!validation.ok) {
      return failure(
        "validateBlueprint",
        validation.errors.length > 0
          ? validation.errors.join("; ")
          : "Blueprint validation failed.",
      );
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Blueprint validation failed.";
    return failure("validateBlueprint", message);
  }

  return { ok: true, blueprint };
}
