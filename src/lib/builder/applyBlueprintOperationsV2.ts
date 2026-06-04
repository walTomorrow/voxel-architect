import type {
  ChimneyComponentV2,
  GenericBuildingBlueprintV2,
  GenericBuildingComponentV2,
  PorchComponentV2,
  RoomComponentV2,
  RoofComponentV2,
  WindowGroupComponentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlueprintMaterialPalette } from "@/src/lib/blueprints/types/materials";
import { CLASSIC_MATERIAL_KEYS } from "@/src/app/generic-lab/genericLabUtils";
import type {
  ApplyOperationsErrorCode,
  ApplyOperationsResult,
  BlueprintOperationV2,
  ComponentPatchV2,
} from "@/src/lib/builder/blueprintOperationsV2";
import { findComponentById } from "@/src/lib/builder/blueprintComponentIndex";

const ROOM_WIDTH = { min: 5, max: 17 } as const;
const ROOM_DEPTH = { min: 5, max: 13 } as const;
const ROOM_HEIGHT = { min: 4, max: 9 } as const;
const PORCH_DEPTH = { min: 1, max: 8 } as const;
const WINDOW_COUNT = { min: 0, max: 12 } as const;
const ROOF_LAYERS = { min: 1, max: 3 } as const;

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function isValidMaterialKey(key: string): boolean {
  return (CLASSIC_MATERIAL_KEYS as readonly string[]).includes(key);
}

function fail(error: string, code: ApplyOperationsErrorCode): ApplyOperationsResult {
  return { ok: false, error, code };
}

function applyRoomPatch(room: RoomComponentV2, patch: Extract<ComponentPatchV2, { type: "room" }>): RoomComponentV2 {
  let width = room.width;
  let depth = room.depth;
  let wallHeight = room.wallHeight;
  if (patch.width !== undefined) width = clampInt(patch.width, ROOM_WIDTH.min, ROOM_WIDTH.max);
  if (patch.depth !== undefined) depth = clampInt(patch.depth, ROOM_DEPTH.min, ROOM_DEPTH.max);
  if (patch.wallHeight !== undefined) {
    wallHeight = clampInt(patch.wallHeight, ROOM_HEIGHT.min, ROOM_HEIGHT.max);
  }
  return { ...room, width, depth, wallHeight };
}

function applyRoofPatch(roof: RoofComponentV2, patch: Extract<ComponentPatchV2, { type: "roof" }>): RoofComponentV2 {
  const next: RoofComponentV2 = { ...roof };
  if (patch.kind !== undefined) {
    return {
      ...next,
      kind: patch.kind,
      layers: patch.kind === "none" ? 0 : (patch.layers ?? next.layers ?? 2),
      orientation: patch.orientation ?? next.orientation,
      overhang: patch.overhang ?? next.overhang,
    };
  }
  if (patch.layers !== undefined) {
    const layers = patch.kind === "none" ? 0 : clampInt(patch.layers, ROOF_LAYERS.min, ROOF_LAYERS.max);
    return { ...next, layers };
  }
  if (patch.overhang !== undefined) return { ...next, overhang: patch.overhang };
  if (patch.orientation !== undefined) return { ...next, orientation: patch.orientation };
  return next;
}

function applyWindowPatch(
  wg: WindowGroupComponentV2,
  patch: Extract<ComponentPatchV2, { type: "window_group" }>,
): WindowGroupComponentV2 {
  let count = wg.count;
  if (patch.count !== undefined) {
    count = clampInt(patch.count, WINDOW_COUNT.min, WINDOW_COUNT.max);
  }
  return {
    ...wg,
    count,
    layout: patch.layout ?? wg.layout,
  };
}

function applyPorchPatch(
  porch: PorchComponentV2,
  patch: Extract<ComponentPatchV2, { type: "porch" }>,
): PorchComponentV2 {
  if (patch.depth === undefined) return porch;
  return {
    ...porch,
    depth: clampInt(patch.depth, PORCH_DEPTH.min, PORCH_DEPTH.max),
  };
}

function applyChimneyPatch(
  chimney: ChimneyComponentV2,
  roomId: string,
  patch: Extract<ComponentPatchV2, { type: "chimney" }>,
): ChimneyComponentV2 {
  let attach = { ...chimney.attach };
  if (patch.targetFace !== undefined && patch.targetFace !== "front") {
    attach = {
      targetSurface: `${roomId}.${patch.targetFace}` as ChimneyComponentV2["attach"]["targetSurface"],
      placement: attach.placement ?? { horizontal: "center" },
    };
  }
  if (patch.placementHorizontal !== undefined) {
    attach = {
      ...attach,
      placement: { horizontal: patch.placementHorizontal },
    };
  }
  return { ...chimney, attach };
}

function applyComponentOp(
  blueprint: GenericBuildingBlueprintV2,
  op: Extract<BlueprintOperationV2, { op: "updateComponent" }>,
  labels: string[],
): { blueprint: GenericBuildingBlueprintV2 } | ApplyOperationsResult {
  const existing = findComponentById(blueprint, op.id);
  if (!existing) {
    return fail(`Unknown component id "${op.id}".`, "UNKNOWN_COMPONENT");
  }
  if (existing.type !== op.componentType) {
    return fail(
      `Component "${op.id}" is type "${existing.type}", not "${op.componentType}".`,
      "TYPE_MISMATCH",
    );
  }
  if (existing.type !== op.patch.type) {
    return fail("Patch type does not match component type.", "TYPE_MISMATCH");
  }

  const room = blueprint.components.find((c) => c.type === "room" && c.role === "root")
    ?? blueprint.components.find((c) => c.type === "room");
  const roomId = room?.id ?? "main-room";

  let updated: GenericBuildingComponentV2;
  switch (op.patch.type) {
    case "room":
      if (existing.type !== "room") return fail("Invalid room patch.", "TYPE_MISMATCH");
      updated = applyRoomPatch(existing, op.patch);
      labels.push(`Updated room dimensions`);
      break;
    case "roof":
      if (existing.type !== "roof") return fail("Invalid roof patch.", "TYPE_MISMATCH");
      updated = applyRoofPatch(existing, op.patch);
      labels.push(`Updated roof`);
      break;
    case "window_group":
      if (existing.type !== "window_group") return fail("Invalid window patch.", "TYPE_MISMATCH");
      updated = applyWindowPatch(existing, op.patch);
      labels.push(`Updated window group (${(updated as WindowGroupComponentV2).count} windows)`);
      break;
    case "porch":
      if (existing.type !== "porch") return fail("Invalid porch patch.", "TYPE_MISMATCH");
      updated = applyPorchPatch(existing, op.patch);
      labels.push(`Updated porch depth`);
      break;
    case "chimney":
      if (existing.type !== "chimney") return fail("Invalid chimney patch.", "TYPE_MISMATCH");
      updated = applyChimneyPatch(existing, roomId, op.patch);
      labels.push(`Updated chimney placement`);
      break;
    default:
      return fail("Unsupported component patch type.", "UNSUPPORTED_FIELD");
  }

  const components = blueprint.components.map((c) =>
    c.id === op.id ? updated : c,
  );
  return { blueprint: { ...blueprint, components } };
}

export function applyBlueprintOperationsV2(
  input: GenericBuildingBlueprintV2,
  operations: readonly BlueprintOperationV2[],
): ApplyOperationsResult & { blueprint?: GenericBuildingBlueprintV2 } {
  let blueprint = structuredClone(input) as GenericBuildingBlueprintV2;
  const appliedLabels: string[] = [];

  for (const op of operations) {
    if (op.op === "setMaterialPalette") {
      const materials = { ...blueprint.materials };
      for (const [key, value] of Object.entries(op.patch) as [keyof BlueprintMaterialPalette, string][]) {
        if (value === undefined) continue;
        if (!isValidMaterialKey(value)) {
          return fail(`Unknown material "${value}" for ${key}.`, "INVALID_VALUE");
        }
        materials[key] = value;
      }
      blueprint = { ...blueprint, materials };
      appliedLabels.push("Updated material palette");
      continue;
    }

    if (op.op === "setMaterialOverride") {
      const existing = findComponentById(blueprint, op.id);
      if (!existing) {
        return fail(`Unknown component id "${op.id}".`, "UNKNOWN_COMPONENT");
      }
      for (const [, value] of Object.entries(op.materials)) {
        if (value !== undefined && !isValidMaterialKey(value)) {
          return fail(`Unknown material override "${value}".`, "INVALID_VALUE");
        }
      }
      const components = blueprint.components.map((c) =>
        c.id === op.id ? { ...c, materials: { ...c.materials, ...op.materials } } : c,
      );
      blueprint = { ...blueprint, components };
      appliedLabels.push(`Updated materials on ${op.id}`);
      continue;
    }

    const result = applyComponentOp(blueprint, op, appliedLabels);
    if ("ok" in result) {
      return result;
    }
    blueprint = result.blueprint;
  }

  return { ok: true, appliedLabels, blueprint };
}
