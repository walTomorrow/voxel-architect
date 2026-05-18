import {
  DEFAULT_GENERIC_V2_PRESET_ID,
  getGenericBuildingPresetV2,
} from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import type { BlueprintMaterialPalette } from "@/src/lib/blueprints/types/materials";
import type {
  ComponentId,
  GenericBuildingBlueprintV2,
  GenericBuildingComponentV2,
  GenericBuildingComponentTypeV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import { parseRoomSurfaceRef } from "@/src/lib/blueprints/parseRoomSurfaceRef";
import type { ComponentPlanV2 } from "@/src/lib/generation/components/v2/types";
import { resolveGenericBuildingV2 } from "@/src/lib/blueprints/resolveGenericBuildingV2";
import { compileGenericBuildingV2Plan } from "@/src/lib/generation/components/v2/compileGenericBuildingV2Plan";
import { PREVIEW_PRESET_OPTIONS_V2 } from "@/src/lib/blueprints/previewPresetCatalog";

export const GENERIC_LAB_V2_PRESET_OPTIONS = PREVIEW_PRESET_OPTIONS_V2.map((p) => ({
  id: p.id,
  label: p.label,
}));

export const FACADE_FACES: readonly RoomFace[] = [
  "front",
  "back",
  "left",
  "right",
];

const SURFACE_ATTACH_TYPES = new Set<GenericBuildingComponentTypeV2>([
  "door",
  "window_group",
  "porch",
  "chimney",
]);

const SURFACE_CHILD_ORDER: Record<string, number> = {
  door: 0,
  window_group: 1,
  porch: 2,
  chimney: 3,
};

export type ComponentTreeNodeKind =
  | "room"
  | "surface"
  | "roof_group"
  | "component";

export type ComponentTreeNode = {
  readonly key: string;
  readonly label: string;
  readonly kind: ComponentTreeNodeKind;
  readonly componentId?: ComponentId;
  readonly componentType?: GenericBuildingComponentTypeV2;
  readonly face?: RoomFace;
  readonly children: readonly ComponentTreeNode[];
};

export type ComponentPlanV2Summary = {
  readonly planVersion: number;
  readonly rootRoomId: string;
  readonly bounds: ComponentPlanV2["bounds"];
  readonly components: readonly {
    readonly kind: string;
    readonly sourceComponentId: string;
  }[];
  readonly maskCounts: {
    readonly shellSkip: number;
    readonly window: number;
    readonly door: number;
  };
};

export function cloneV2PresetBlueprint(presetId: string): GenericBuildingBlueprintV2Draft {
  const preset =
    getGenericBuildingPresetV2(presetId) ??
    getGenericBuildingPresetV2(DEFAULT_GENERIC_V2_PRESET_ID);
  if (!preset) {
    throw new Error("No generic building v2 presets available.");
  }
  return structuredClone(preset.blueprint) as unknown as GenericBuildingBlueprintV2Draft;
}

export function blueprintToDebugJson(blueprint: GenericBuildingBlueprintV2): string {
  return JSON.stringify(blueprint, null, 2);
}

export function findRootRoom(
  draft: GenericBuildingBlueprintV2Draft,
): GenericBuildingComponentV2 | undefined {
  return draft.components.find((c) => c.type === "room");
}

export function facadeSurfaceRefs(
  rootRoomId: ComponentId,
): readonly { face: RoomFace; ref: RoomSurfaceRef }[] {
  return FACADE_FACES.map((face) => ({
    face,
    ref: `${rootRoomId}.${face}` as RoomSurfaceRef,
  }));
}

export function targetSurfaceOptions(
  draft: GenericBuildingBlueprintV2Draft,
): readonly RoomSurfaceRef[] {
  const room = findRootRoom(draft);
  if (!room) return [];
  return facadeSurfaceRefs(room.id).map((s) => s.ref);
}

export function doorComponentIds(draft: GenericBuildingBlueprintV2Draft): ComponentId[] {
  return draft.components.filter((c) => c.type === "door").map((c) => c.id);
}

function sortSurfaceChildren(
  a: GenericBuildingComponentV2,
  b: GenericBuildingComponentV2,
): number {
  const oa = SURFACE_CHILD_ORDER[a.type] ?? 99;
  const ob = SURFACE_CHILD_ORDER[b.type] ?? 99;
  if (oa !== ob) return oa - ob;
  return a.id.localeCompare(b.id);
}

function componentLabel(comp: GenericBuildingComponentV2): string {
  const typeLabel = comp.type.replace("_", " ");
  return comp.label ? `${comp.id} (${typeLabel})` : `${comp.id} · ${typeLabel}`;
}

function buildComponentNode(
  comp: GenericBuildingComponentV2,
  stepsByDoor: Map<ComponentId, GenericBuildingComponentV2[]>,
): ComponentTreeNode {
  const children: ComponentTreeNode[] = [];
  if (comp.type === "door") {
    const steps = stepsByDoor.get(comp.id) ?? [];
    for (const step of steps) {
      children.push({
        key: `component:${step.id}`,
        label: componentLabel(step),
        kind: "component",
        componentId: step.id,
        componentType: step.type,
        children: [],
      });
    }
  }
  return {
    key: `component:${comp.id}`,
    label: componentLabel(comp),
    kind: "component",
    componentId: comp.id,
    componentType: comp.type,
    children,
  };
}

export function buildComponentTree(
  draft: GenericBuildingBlueprintV2Draft,
): ComponentTreeNode | null {
  const room = findRootRoom(draft);
  if (!room || room.type !== "room") return null;

  const rootRoomId = room.id;
  const steps = draft.components.filter((c) => c.type === "step");
  const stepsByDoor = new Map<ComponentId, GenericBuildingComponentV2[]>();
  for (const step of steps) {
    if (step.type !== "step") continue;
    const doorId = step.attach.targetDoor;
    const list = stepsByDoor.get(doorId) ?? [];
    list.push(step);
    stepsByDoor.set(doorId, list);
  }

  const roofs = draft.components.filter((c) => c.type === "roof");

  const surfaceNodes: ComponentTreeNode[] = FACADE_FACES.map((face) => {
    const ref = `${rootRoomId}.${face}` as RoomSurfaceRef;
    const onSurface = draft.components.filter((c) => {
      if (!SURFACE_ATTACH_TYPES.has(c.type)) return false;
      if (
        c.type === "door" ||
        c.type === "window_group" ||
        c.type === "porch" ||
        c.type === "chimney"
      ) {
        return c.attach.targetSurface === ref;
      }
      return false;
    });
    onSurface.sort(sortSurfaceChildren);
    return {
      key: `surface:${face}`,
      label: face,
      kind: "surface",
      face,
      children: onSurface.map((c) => buildComponentNode(c, stepsByDoor)),
    };
  });

  const roofChildren: ComponentTreeNode[] = roofs.map((r) => ({
    key: `component:${r.id}`,
    label: componentLabel(r),
    kind: "component",
    componentId: r.id,
    componentType: r.type,
    children: [],
  }));

  return {
    key: `room:${rootRoomId}`,
    label: `${rootRoomId} (room)`,
    kind: "room",
    componentId: rootRoomId,
    componentType: "room",
    children: [
      ...surfaceNodes,
      {
        key: "roof-group",
        label: "roof",
        kind: "roof_group",
        children: roofChildren,
      },
    ],
  };
}

export function patchComponent(
  draft: GenericBuildingBlueprintV2Draft,
  componentId: ComponentId,
  next: GenericBuildingComponentV2,
): GenericBuildingBlueprintV2Draft {
  return {
    ...draft,
    components: draft.components.map((c) =>
      c.id === componentId ? next : c,
    ),
  };
}

export function setRootMaterial(
  draft: GenericBuildingBlueprintV2Draft,
  slot: keyof BlueprintMaterialPalette,
  value: BlueprintMaterialPalette[keyof BlueprintMaterialPalette],
): GenericBuildingBlueprintV2Draft {
  return {
    ...draft,
    materials: { ...draft.materials, [slot]: value },
  };
}

export function setComponentMaterialOverride(
  draft: GenericBuildingBlueprintV2Draft,
  componentId: ComponentId,
  slot: keyof BlueprintMaterialPalette,
  value: BlueprintMaterialPalette[keyof BlueprintMaterialPalette] | undefined,
): GenericBuildingBlueprintV2Draft {
  return {
    ...draft,
    components: draft.components.map((c) => {
      if (c.id !== componentId) return c;
      const materials = { ...(c.materials ?? {}) };
      if (value === undefined) {
        delete materials[slot];
      } else {
        materials[slot] = value;
      }
      const nextMaterials = Object.keys(materials).length > 0 ? materials : undefined;
      return { ...c, materials: nextMaterials };
    }),
  };
}

export function summarizeComponentPlanV2(
  normalized: GenericBuildingBlueprintV2,
): ComponentPlanV2Summary {
  const resolved = resolveGenericBuildingV2(normalized);
  const plan = compileGenericBuildingV2Plan(resolved);
  return {
    planVersion: plan.planVersion,
    rootRoomId: plan.rootRoomId,
    bounds: plan.bounds,
    components: plan.components.map((c) => ({
      kind: c.kind,
      sourceComponentId: c.sourceComponentId,
    })),
    maskCounts: {
      shellSkip: plan.openings.shellSkipMask.size,
      window: plan.openings.windowMask.size,
      door: plan.openings.doorMask.size,
    },
  };
}

export function parseTargetSurface(ref: string): { roomId: string; face: RoomFace } | null {
  const r = parseRoomSurfaceRef(ref);
  if (!r.ok) return null;
  return r.parsed;
}
