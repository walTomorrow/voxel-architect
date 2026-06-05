import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";
import { facadeInteriorSpan } from "@/src/lib/generation/components/geometry/facadeSides";
import type { EntranceSide } from "./types";
import { parseRoomSurfaceRef } from "./parseRoomSurfaceRef";
import type {
  BlueprintValidationResultV2,
  ValidationIssue,
} from "./types/validationResult";
import type {
  BlueprintMaterialPalette,
  ComponentMaterialOverride,
} from "./types/materials";
import {
  isWindowTreatmentV2,
  normalizeWindowTreatment,
} from "@/src/lib/blueprints/windowTreatment";
import type {
  ChimneyComponentV2,
  ComponentId,
  DoorComponentV2,
  GenericBuildingBlueprintV2,
  HorizontalPlacementV2,
  PorchComponentV2,
  RoofComponentV2,
  RoomComponentV2,
  RoomFace,
  RoomSurfaceRef,
  StepComponentV2,
  SurfaceAttachment,
  WindowGroupComponentV2,
} from "./types/genericBuildingV2";

const COMPONENT_ID_RE = /^[a-z][a-z0-9-]*$/;

type WritableRoomComponentV2 = { -readonly [K in keyof RoomComponentV2]: RoomComponentV2[K] };
type WritableRoofComponentV2 = { -readonly [K in keyof RoofComponentV2]: RoofComponentV2[K] };
type WritableDoorComponentV2 = { -readonly [K in keyof DoorComponentV2]: DoorComponentV2[K] };
type WritableWindowGroupComponentV2 = {
  -readonly [K in keyof WindowGroupComponentV2]: WindowGroupComponentV2[K];
};
type WritablePorchComponentV2 = { -readonly [K in keyof PorchComponentV2]: PorchComponentV2[K] };
type WritableChimneyComponentV2 = {
  -readonly [K in keyof ChimneyComponentV2]: ChimneyComponentV2[K];
};
type WritableStepComponentV2 = { -readonly [K in keyof StepComponentV2]: StepComponentV2[K] };

type WritableGenericBuildingComponentV2 =
  | WritableRoomComponentV2
  | WritableRoofComponentV2
  | WritableDoorComponentV2
  | WritableWindowGroupComponentV2
  | WritablePorchComponentV2
  | WritableChimneyComponentV2
  | WritableStepComponentV2;

type WritableGenericBuildingBlueprintV2 = {
  -readonly [K in keyof GenericBuildingBlueprintV2]: K extends "components"
    ? WritableGenericBuildingComponentV2[]
    : GenericBuildingBlueprintV2[K] extends object
      ? { -readonly [P in keyof GenericBuildingBlueprintV2[K]]: GenericBuildingBlueprintV2[K][P] }
      : GenericBuildingBlueprintV2[K];
};

/** @internal Writable clone for normalization tests and draft mutation. */
export type GenericBuildingBlueprintV2Draft = WritableGenericBuildingBlueprintV2;

const MATERIAL_SLOTS = [
  "wall",
  "floor",
  "roof",
  "window",
  "door",
  "accent",
] as const satisfies readonly (keyof BlueprintMaterialPalette)[];

type IssueInput = Omit<ValidationIssue, "severity"> & {
  readonly severity: ValidationIssue["severity"];
};

function issue(input: IssueInput): ValidationIssue {
  return input;
}

function isClassicKey(k: string): k is keyof typeof CLASSIC_BLOCK_PACK {
  return Object.prototype.hasOwnProperty.call(CLASSIC_BLOCK_PACK, k);
}

function faceToEntranceSide(face: RoomFace): EntranceSide | null {
  if (face === "roof") return null;
  return face;
}

function facadeSpanLength(W: number, D: number, T: number, face: RoomFace): number {
  const side = faceToEntranceSide(face);
  if (!side) return 0;
  const { lo, hi } = facadeInteriorSpan(side, W, D, T);
  return Math.max(0, hi - lo + 1);
}

function maxDoorWidthOnFacade(
  W: number,
  D: number,
  T: number,
  face: RoomFace,
): number {
  const side = faceToEntranceSide(face);
  if (!side) return 0;
  const span = side === "front" || side === "back" ? W : D;
  return Math.max(1, span - 2 * T - 2);
}

/** Max window slots with minimum spacing on a façade interior span. */
function maxWindowSlotsOnFacade(spanLen: number): number {
  if (spanLen < 3) return 0;
  return Math.max(0, Math.floor((spanLen + 1) / 3));
}

export function validateGenericBuildingBlueprintV2(
  blueprint: GenericBuildingBlueprintV2,
): BlueprintValidationResultV2 {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const notes: ValidationIssue[] = [];

  const pushError = (partial: Omit<IssueInput, "severity">) => {
    errors.push(issue({ ...partial, severity: "error" }));
  };
  const pushWarning = (partial: Omit<IssueInput, "severity">) => {
    warnings.push(issue({ ...partial, severity: "warning" }));
  };
  const pushNote = (partial: Omit<IssueInput, "severity">) => {
    notes.push(issue({ ...partial, severity: "note" }));
  };

  if (blueprint.structureType !== "generic_building") {
    pushError({
      code: "invalid_structure_type",
      message: `structureType must be "generic_building".`,
      path: "/structureType",
    });
  }

  if (blueprint.schemaVersion !== 2) {
    pushError({
      code: "invalid_schema_version",
      message: "schemaVersion must be 2.",
      path: "/schemaVersion",
    });
  }

  if (!Array.isArray(blueprint.components) || blueprint.components.length === 0) {
    pushError({
      code: "empty_components",
      message: "components must contain at least one entry.",
      path: "/components",
    });
  }

  validateMaterialPalette(blueprint.materials, "/materials", pushError);

  const working = structuredClone(blueprint) as unknown as WritableGenericBuildingBlueprintV2;
  const { components } = working;
  const byId = new Map<ComponentId, WritableGenericBuildingComponentV2>();

  components.forEach((comp, index) => {
    const basePath = `/components/${index}`;

    if (!comp || typeof comp !== "object") {
      pushError({
        code: "invalid_component",
        message: "Component must be an object.",
        path: basePath,
      });
      return;
    }

    if (typeof comp.id !== "string" || !COMPONENT_ID_RE.test(comp.id)) {
      pushError({
        code: "invalid_component_id",
        message: `Component id must match /^[a-z][a-z0-9-]*$/ (got "${String(comp.id)}").`,
        path: `${basePath}/id`,
      });
    } else if (byId.has(comp.id)) {
      pushError({
        code: "duplicate_component_id",
        message: `Duplicate component id "${comp.id}".`,
        path: `${basePath}/id`,
        componentId: comp.id,
      });
    } else {
      byId.set(comp.id, comp);
    }

    if (comp.materials) {
      validateMaterialOverride(
        comp.materials,
        `${basePath}/materials`,
        comp.id,
        pushError,
      );
    }

    switch (comp.type) {
      case "room":
        validateRoomDraft(comp, basePath, pushError);
        break;
      case "roof":
        validateRoofDraft(comp, basePath, pushError, pushNote);
        break;
      case "door":
        validateDoorDraft(comp, basePath, pushError, pushNote);
        break;
      case "window_group":
        validateWindowGroupDraft(comp, basePath, pushError, pushNote);
        break;
      case "porch":
        validatePorchDraft(comp, basePath, pushError, pushNote);
        break;
      case "chimney":
        validateChimneyDraft(comp, basePath, pushError, pushNote);
        break;
      case "step":
        validateStepDraft(comp, basePath, pushError);
        break;
      default: {
        const unknownType = (comp as { type?: string }).type ?? "?";
        pushError({
          code: "invalid_component_type",
          message: `Unknown component type "${unknownType}".`,
          path: `${basePath}/type`,
        });
      }
    }
  });

  const rooms = components.filter((c): c is RoomComponentV2 => c.type === "room");
  if (rooms.length === 0) {
    pushError({
      code: "missing_root_room",
      message: "Exactly one room component is required.",
      path: "/components",
    });
  } else if (rooms.length > 1) {
    pushError({
      code: "multiple_root_rooms",
      message: `Expected one room component, found ${rooms.length}.`,
      path: "/components",
    });
  }

  const rootRoom = rooms.length === 1 ? rooms[0] : null;
  const rootRoomId = rootRoom?.id;

  if (rootRoom) {
    const roomPath = `/components/${components.indexOf(rootRoom)}`;
    if (rootRoom.hollowInterior) {
      const { width: W, depth: D, wallThickness: T } = rootRoom;
      if (W < 2 * T + 2 || D < 2 * T + 2) {
        pushError({
          code: "hollow_interior_too_small",
          message:
            "hollowInterior requires footprint large enough for an inner void.",
          path: roomPath,
          componentId: rootRoom.id,
        });
      }
    }
  }

  const doors = components.filter((c) => c.type === "door");
  const windowGroups = components.filter((c) => c.type === "window_group");
  const stepByDoor = new Map<ComponentId, number>();

  if (doors.length === 0) {
    pushWarning({
      code: "no_door",
      message: "Blueprint has no door component.",
      path: "/components",
    });
  }

  if (windowGroups.length === 0) {
    pushWarning({
      code: "no_windows",
      message: "Blueprint has no window_group component.",
      path: "/components",
    });
  } else if (windowGroups.every((w) => w.count <= 0)) {
    pushWarning({
      code: "no_windows",
      message: "All window_group components have count 0.",
      path: "/components",
    });
  }

  components.forEach((comp, index) => {
    const basePath = `/components/${index}`;

    if (comp.type === "roof") {
      if (!comp.targetRoom) {
        pushError({
          code: "missing_target_room",
          message: "roof requires targetRoom.",
          path: `${basePath}/targetRoom`,
          componentId: comp.id,
        });
      } else if (!byId.has(comp.targetRoom)) {
        pushError({
          code: "unknown_target_room",
          message: `roof targetRoom "${comp.targetRoom}" does not match any component.`,
          path: `${basePath}/targetRoom`,
          componentId: comp.id,
        });
      } else if (rootRoomId && comp.targetRoom !== rootRoomId) {
        pushError({
          code: "target_room_not_root",
          message: `roof targetRoom must be the root room "${rootRoomId}".`,
          path: `${basePath}/targetRoom`,
          componentId: comp.id,
        });
      } else if (byId.get(comp.targetRoom)?.type !== "room") {
        pushError({
          code: "target_room_not_room",
          message: `roof targetRoom "${comp.targetRoom}" is not a room component.`,
          path: `${basePath}/targetRoom`,
          componentId: comp.id,
        });
      }
      return;
    }

    if (comp.type === "step") {
      const doorId = comp.attach?.targetDoor;
      if (!doorId) {
        pushError({
          code: "missing_target_door",
          message: "step requires attach.targetDoor.",
          path: `${basePath}/attach/targetDoor`,
          componentId: comp.id,
        });
        return;
      }
      const doorComp = byId.get(doorId);
      if (!doorComp) {
        pushError({
          code: "unknown_target_door",
          message: `step attach.targetDoor "${doorId}" does not match any component.`,
          path: `${basePath}/attach/targetDoor`,
          componentId: comp.id,
          anchor: doorId,
        });
        return;
      }
      if (doorComp.type !== "door") {
        pushError({
          code: "target_door_not_door",
          message: `step attach.targetDoor "${doorId}" is not a door component.`,
          path: `${basePath}/attach/targetDoor`,
          componentId: comp.id,
          anchor: doorId,
        });
        return;
      }
      const prev = stepByDoor.get(doorId) ?? 0;
      stepByDoor.set(doorId, prev + 1);
      if (prev + 1 > 1) {
        pushError({
          code: "multiple_steps_per_door",
          message: `At most one step per door; duplicate for "${doorId}".`,
          path: `${basePath}/attach/targetDoor`,
          componentId: comp.id,
          anchor: doorId,
        });
      }
      return;
    }

    if (
      comp.type === "door" ||
      comp.type === "window_group" ||
      comp.type === "porch" ||
      comp.type === "chimney"
    ) {
      const attach = comp.attach;
      if (!attach?.targetSurface) {
        pushError({
          code: "missing_target_surface",
          message: `${comp.type} requires attach.targetSurface.`,
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
        });
        return;
      }

      const surfaceResult = parseRoomSurfaceRef(attach.targetSurface);
      if (!surfaceResult.ok) {
        pushError({
          code: "invalid_target_surface",
          message: surfaceResult.message,
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
          surface: attach.targetSurface as RoomSurfaceRef,
        });
        return;
      }

      const { roomId, face } = surfaceResult.parsed;
      const targetComp = byId.get(roomId);
      if (!targetComp) {
        pushError({
          code: "unknown_surface_room",
          message: `targetSurface room "${roomId}" does not match any component.`,
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
          surface: attach.targetSurface,
        });
        return;
      }

      if (targetComp.type !== "room") {
        pushError({
          code: "surface_target_not_room",
          message: `targetSurface room "${roomId}" is not a room component.`,
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
          surface: attach.targetSurface,
        });
        return;
      }

      if (rootRoomId && roomId !== rootRoomId) {
        pushError({
          code: "surface_not_root_room",
          message: `targetSurface must reference the root room "${rootRoomId}".`,
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
          surface: attach.targetSurface,
        });
        return;
      }

      if (face === "roof") {
        pushError({
          code: "surface_roof_not_allowed",
          message: `${comp.type} cannot target the roof surface.`,
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
          surface: attach.targetSurface,
        });
        return;
      }

      if (comp.type === "chimney" && face === "front") {
        pushWarning({
          code: "chimney_on_front",
          message: "Chimney is attached to the front façade.",
          path: `${basePath}/attach/targetSurface`,
          componentId: comp.id,
          surface: attach.targetSurface,
        });
      }

      if (rootRoom) {
        const { width: W, depth: D, wallThickness: T, wallHeight } = rootRoom;
        const spanLen = facadeSpanLength(W, D, T, face);

        if (comp.type === "door") {
          if (!Number.isInteger(comp.width) || comp.width < 1 || comp.width > 3) {
            pushError({
              code: "invalid_door_width",
              message: "door width must be an integer from 1 to 3.",
              path: `${basePath}/width`,
              componentId: comp.id,
            });
          } else if (comp.width > maxDoorWidthOnFacade(W, D, T, face)) {
            pushError({
              code: "door_too_wide",
              message: `door width (${comp.width}) exceeds available span on ${attach.targetSurface}.`,
              path: `${basePath}/width`,
              componentId: comp.id,
              surface: attach.targetSurface,
            });
          }
          if (!Number.isInteger(comp.height) || comp.height < 2 || comp.height > 4) {
            pushError({
              code: "invalid_door_height",
              message: "door height must be an integer from 2 to 4.",
              path: `${basePath}/height`,
              componentId: comp.id,
            });
          } else if (comp.height > wallHeight) {
            pushError({
              code: "door_too_tall",
              message: `door height (${comp.height}) exceeds room wallHeight (${wallHeight}).`,
              path: `${basePath}/height`,
              componentId: comp.id,
            });
          }
        }

        if (comp.type === "window_group") {
          if (!Number.isInteger(comp.count) || comp.count < 0 || comp.count > 12) {
            pushError({
              code: "invalid_window_count",
              message: "window_group count must be an integer from 0 to 12.",
              path: `${basePath}/count`,
              componentId: comp.id,
            });
          } else if (comp.count > 0) {
            const maxSlots = maxWindowSlotsOnFacade(spanLen);
            if (comp.count > maxSlots) {
              pushError({
                code: "window_count_exceeds_facade",
                message: `window_group count (${comp.count}) exceeds façade capacity (~${maxSlots} slots on ${attach.targetSurface}).`,
                path: `${basePath}/count`,
                componentId: comp.id,
                surface: attach.targetSurface,
              });
            } else if (comp.count >= Math.max(1, maxSlots - 1) && maxSlots >= 3) {
              pushWarning({
                code: "window_count_high",
                message: `window_group count (${comp.count}) is near the façade capacity (${maxSlots} on ${attach.targetSurface}).`,
                path: `${basePath}/count`,
                componentId: comp.id,
                surface: attach.targetSurface,
              });
            }
          }
        }
      }

      if (comp.type === "porch") {
        if (comp.aroundDoor !== undefined) {
          const doorComp = byId.get(comp.aroundDoor);
          if (!doorComp) {
            pushError({
              code: "unknown_around_door",
              message: `porch aroundDoor "${comp.aroundDoor}" does not match any component.`,
              path: `${basePath}/aroundDoor`,
              componentId: comp.id,
              anchor: comp.aroundDoor,
            });
          } else if (doorComp.type !== "door") {
            pushError({
              code: "around_door_not_door",
              message: `porch aroundDoor "${comp.aroundDoor}" is not a door component.`,
              path: `${basePath}/aroundDoor`,
              componentId: comp.id,
              anchor: comp.aroundDoor,
            });
          }
        }

        if (comp.widthMode === "door_only" && !comp.aroundDoor) {
          pushError({
            code: "porch_around_door_required",
            message: 'porch widthMode "door_only" requires aroundDoor.',
            path: `${basePath}/aroundDoor`,
            componentId: comp.id,
          });
        }

        if (comp.widthMode === "full_facade" && comp.aroundDoor) {
          pushError({
            code: "porch_around_door_forbidden",
            message: 'porch aroundDoor must not be set when widthMode is "full_facade".',
            path: `${basePath}/aroundDoor`,
            componentId: comp.id,
          });
        }

        if (Number.isInteger(comp.depth) && comp.depth > 4) {
          pushWarning({
            code: "porch_depth_large",
            message: `porch depth (${comp.depth}) is unusually large.`,
            path: `${basePath}/depth`,
            componentId: comp.id,
          });
        }
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors, warnings, notes };
  }

  const normalized = working as unknown as GenericBuildingBlueprintV2;
  return {
    ok: true,
    errors: [],
    warnings,
    notes,
    normalized,
  };
}

function validateMaterialPalette(
  materials: BlueprintMaterialPalette,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
): void {
  for (const slot of MATERIAL_SLOTS) {
    const key = materials[slot];
    if (typeof key !== "string" || !isClassicKey(key)) {
      pushError({
        code: "invalid_material_key",
        message: `Unknown classic material key "${String(key)}" for slot "${slot}".`,
        path: `${path}/${slot}`,
      });
    }
  }
}

function validateMaterialOverride(
  materials: ComponentMaterialOverride,
  path: string,
  componentId: ComponentId,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
): void {
  for (const slot of MATERIAL_SLOTS) {
    const key = materials[slot];
    if (key === undefined) continue;
    if (typeof key !== "string" || !isClassicKey(key)) {
      pushError({
        code: "invalid_material_override",
        message: `Unknown classic material key "${String(key)}" for override slot "${slot}".`,
        path: `${path}/${slot}`,
        componentId,
      });
    }
  }
}

function validateRoomDraft(
  room: WritableRoomComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
): void {
  const { width: W, depth: D, wallHeight, wallThickness: T } = room;
  if (!Number.isInteger(W) || W < 5 || W > 17) {
    pushError({
      code: "invalid_room_width",
      message: "room width must be an integer from 5 to 17.",
      path: `${path}/width`,
      componentId: room.id,
    });
  }
  if (!Number.isInteger(D) || D < 5 || D > 13) {
    pushError({
      code: "invalid_room_depth",
      message: "room depth must be an integer from 5 to 13.",
      path: `${path}/depth`,
      componentId: room.id,
    });
  }
  if (!Number.isInteger(wallHeight) || wallHeight < 4 || wallHeight > 9) {
    pushError({
      code: "invalid_room_wall_height",
      message: "room wallHeight must be an integer from 4 to 9.",
      path: `${path}/wallHeight`,
      componentId: room.id,
    });
  }
  if (!Number.isInteger(T) || T < 1 || T > 2) {
    pushError({
      code: "invalid_room_wall_thickness",
      message: "room wallThickness must be 1 or 2.",
      path: `${path}/wallThickness`,
      componentId: room.id,
    });
  }
}

function normalizePlacement(
  attach: SurfaceAttachment,
  path: string,
  componentId: ComponentId,
  pushNote: (partial: Omit<IssueInput, "severity">) => void,
): HorizontalPlacementV2 {
  if (!attach.placement?.horizontal) {
    pushNote({
      code: "default_placement_horizontal",
      message: 'placement.horizontal defaulted to "center".',
      path: `${path}/attach/placement/horizontal`,
      componentId,
    });
    return { horizontal: "center" };
  }
  const h = attach.placement.horizontal;
  if (h !== "left" && h !== "center" && h !== "right") {
    return { horizontal: "center" };
  }
  return { horizontal: h };
}

function validateRoofDraft(
  roof: WritableRoofComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
  pushNote: (partial: Omit<IssueInput, "severity">) => void,
): void {
  if (roof.kind !== "pitched_gable" && roof.kind !== "shed" && roof.kind !== "none") {
    pushError({
      code: "invalid_roof_kind",
      message: `Invalid roof kind "${String(roof.kind)}".`,
      path: `${path}/kind`,
      componentId: roof.id,
    });
  }

  if (roof.kind === "none") {
    if (roof.layers !== undefined && roof.layers !== 0) {
      pushNote({
        code: "roof_layers_cleared",
        message: "roof layers ignored when kind is none.",
        path: `${path}/layers`,
        componentId: roof.id,
      });
    }
    roof.layers = 0;
    roof.overhang = roof.overhang ?? 0;
    return;
  }

  let layers = roof.layers ?? (roof.kind === "pitched_gable" ? 2 : 1);
  const rawLayers = roof.layers;
  layers = Math.max(1, Math.min(3, Math.floor(layers)));
  if (rawLayers !== undefined && rawLayers !== layers) {
    pushNote({
      code: "roof_layers_clamped",
      message: `roof layers clamped from ${rawLayers} to ${layers}.`,
      path: `${path}/layers`,
      componentId: roof.id,
    });
  } else if (rawLayers === undefined) {
    pushNote({
      code: "roof_layers_defaulted",
      message: `roof layers defaulted to ${layers}.`,
      path: `${path}/layers`,
      componentId: roof.id,
    });
  }
  roof.layers = layers;

  let overhang = roof.overhang ?? 0;
  const rawOverhang = roof.overhang;
  if (overhang < 0) overhang = 0;
  if (overhang > 1) {
    pushNote({
      code: "roof_overhang_clamped",
      message: `roof overhang clamped from ${rawOverhang} to 1.`,
      path: `${path}/overhang`,
      componentId: roof.id,
    });
    overhang = 1;
  } else if (rawOverhang === undefined) {
    pushNote({
      code: "roof_overhang_defaulted",
      message: "roof overhang defaulted to 0.",
      path: `${path}/overhang`,
      componentId: roof.id,
    });
  }
  roof.overhang = overhang;

  if (roof.kind === "shed" && !roof.orientation) {
    roof.orientation = "front_back";
    pushNote({
      code: "roof_orientation_defaulted",
      message: 'roof orientation defaulted to "front_back".',
      path: `${path}/orientation`,
      componentId: roof.id,
    });
  }
}

function validateDoorDraft(
  door: WritableDoorComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
  pushNote: (partial: Omit<IssueInput, "severity">) => void,
): void {
  if (!door.attach) {
    pushError({
      code: "missing_attach",
      message: "door requires attach.",
      path: `${path}/attach`,
      componentId: door.id,
    });
    return;
  }
  door.attach = {
    ...door.attach,
    placement: normalizePlacement(door.attach, path, door.id, pushNote),
  };
}

function validateWindowGroupDraft(
  win: WritableWindowGroupComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
  pushNote: (partial: Omit<IssueInput, "severity">) => void,
): void {
  if (!win.attach) {
    pushError({
      code: "missing_attach",
      message: "window_group requires attach.",
      path: `${path}/attach`,
      componentId: win.id,
    });
    return;
  }
  win.attach = {
    ...win.attach,
    placement: normalizePlacement(win.attach, path, win.id, pushNote),
  };

  if (win.layout !== "symmetric" && win.layout !== "even") {
    pushError({
      code: "invalid_window_layout",
      message: `window_group layout must be "symmetric" or "even".`,
      path: `${path}/layout`,
      componentId: win.id,
    });
  }

  if (win.windowTreatment !== undefined && !isWindowTreatmentV2(win.windowTreatment)) {
    pushError({
      code: "invalid_window_treatment",
      message: 'window_group windowTreatment must be "glass_block", "glass_pane", or "open".',
      path: `${path}/windowTreatment`,
      componentId: win.id,
    });
  }
  if (win.windowTreatment === undefined) {
    win.windowTreatment = normalizeWindowTreatment(undefined);
    pushNote({
      code: "window_treatment_defaulted",
      message: 'window_group windowTreatment defaulted to "glass_block".',
      path: `${path}/windowTreatment`,
      componentId: win.id,
    });
  }

  if (win.heightBand === undefined) {
    win.heightBand = "auto";
    pushNote({
      code: "window_height_band_defaulted",
      message: 'window_group heightBand defaulted to "auto".',
      path: `${path}/heightBand`,
      componentId: win.id,
    });
  } else if (
    win.heightBand !== "auto" &&
    win.heightBand !== "mid" &&
    win.heightBand !== "upper"
  ) {
    pushError({
      code: "invalid_window_height_band",
      message: `Invalid heightBand "${String(win.heightBand)}".`,
      path: `${path}/heightBand`,
      componentId: win.id,
    });
  }
}

function validatePorchDraft(
  porch: WritablePorchComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
  pushNote: (partial: Omit<IssueInput, "severity">) => void,
): void {
  if (!porch.attach) {
    pushError({
      code: "missing_attach",
      message: "porch requires attach.",
      path: `${path}/attach`,
      componentId: porch.id,
    });
    return;
  }
  porch.attach = {
    ...porch.attach,
    placement: normalizePlacement(porch.attach, path, porch.id, pushNote),
  };

  if (porch.widthMode !== "door_only" && porch.widthMode !== "full_facade") {
    pushError({
      code: "invalid_porch_width_mode",
      message: `porch widthMode must be "door_only" or "full_facade".`,
      path: `${path}/widthMode`,
      componentId: porch.id,
    });
  }
  if (!Number.isInteger(porch.depth) || porch.depth < 1 || porch.depth > 8) {
    pushError({
      code: "invalid_porch_depth",
      message: "porch depth must be an integer from 1 to 8.",
      path: `${path}/depth`,
      componentId: porch.id,
    });
  }
}

function validateChimneyDraft(
  chimney: WritableChimneyComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
  pushNote: (partial: Omit<IssueInput, "severity">) => void,
): void {
  if (!chimney.attach) {
    pushError({
      code: "missing_attach",
      message: "chimney requires attach.",
      path: `${path}/attach`,
      componentId: chimney.id,
    });
    return;
  }
  chimney.attach = {
    ...chimney.attach,
    placement: normalizePlacement(chimney.attach, path, chimney.id, pushNote),
  };
}

function validateStepDraft(
  step: WritableStepComponentV2,
  path: string,
  pushError: (partial: Omit<IssueInput, "severity">) => void,
): void {
  if (!step.attach?.targetDoor) {
    pushError({
      code: "missing_target_door",
      message: "step requires attach.targetDoor.",
      path: `${path}/attach/targetDoor`,
      componentId: step.id,
    });
  }
}
