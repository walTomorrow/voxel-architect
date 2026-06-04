import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseCurrentBlueprintV2(
  raw: unknown,
): { ok: true; blueprint: GenericBuildingBlueprintV2 } | { ok: false; error: string } {
  if (raw == null) {
    return { ok: true, blueprint: null as never }; // caller handles null separately
  }
  if (!isRecord(raw)) {
    return { ok: false, error: "currentBlueprint must be an object." };
  }
  if (raw.structureType !== "generic_building") {
    return { ok: false, error: "currentBlueprint.structureType must be generic_building." };
  }
  if (raw.schemaVersion !== 2) {
    return { ok: false, error: "currentBlueprint.schemaVersion must be 2." };
  }
  if (!Array.isArray(raw.components) || raw.components.length === 0) {
    return { ok: false, error: "currentBlueprint.components must be a non-empty array." };
  }
  if (!isRecord(raw.materials) || !isRecord(raw.constraints) || !isRecord(raw.metadata)) {
    return { ok: false, error: "currentBlueprint is missing required fields." };
  }
  return { ok: true, blueprint: raw as unknown as GenericBuildingBlueprintV2 };
}
