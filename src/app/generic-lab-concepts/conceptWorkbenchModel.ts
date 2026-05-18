import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type {
  GenericBuildingComponentV2,
  GenericBuildingComponentTypeV2,
  RoomFace,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import { parseRoomSurfaceRef } from "@/src/lib/blueprints/parseRoomSurfaceRef";

export const CONCEPT_PRESET_ID = "porch_house_v2" as const;

export type IssueTone = "ok" | "warn" | "error";

const TYPE_META: Record<
  GenericBuildingComponentTypeV2,
  { readonly badge: string; readonly accent: string }
> = {
  room: { badge: "RM", accent: "violet" },
  roof: { badge: "RF", accent: "slate" },
  door: { badge: "DR", accent: "amber" },
  window_group: { badge: "WG", accent: "sky" },
  porch: { badge: "PC", accent: "emerald" },
  chimney: { badge: "CH", accent: "orange" },
  step: { badge: "ST", accent: "zinc" },
};

export function typeMeta(type: GenericBuildingComponentTypeV2) {
  return TYPE_META[type];
}

export function faceDisplayLabel(face: RoomFace): string {
  const map: Record<RoomFace, string> = {
    front: "Front face",
    back: "Back face",
    left: "Left face",
    right: "Right face",
    roof: "Roof",
  };
  return map[face];
}

export function componentDisplayName(comp: GenericBuildingComponentV2): string {
  if (comp.label?.trim()) return comp.label.trim();
  return comp.id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function issuesForComponent(
  issues: readonly ValidationIssue[],
  componentId: string,
): readonly ValidationIssue[] {
  return issues.filter((i) => i.componentId === componentId);
}

export function worstTone(issues: readonly ValidationIssue[]): IssueTone {
  if (issues.some((i) => i.severity === "error")) return "error";
  if (issues.some((i) => i.severity === "warning")) return "warn";
  if (issues.length > 0) return "ok";
  return "ok";
}

export function faceFromComponent(
  comp: GenericBuildingComponentV2,
): RoomFace | undefined {
  if (comp.type === "roof") return "roof";
  if (
    comp.type === "door" ||
    comp.type === "window_group" ||
    comp.type === "porch" ||
    comp.type === "chimney"
  ) {
    const parsed = parseRoomSurfaceRef(comp.attach.targetSurface);
    if (parsed.ok) return parsed.parsed.face;
  }
  if (comp.type === "step") return "front";
  return undefined;
}

export function materialChipsForComponent(
  draft: GenericBuildingBlueprintV2Draft,
  comp: GenericBuildingComponentV2,
): string[] {
  const chips: string[] = [];
  const slots = ["wall", "floor", "roof", "window", "door", "accent"] as const;
  for (const slot of slots) {
    const v = comp.materials?.[slot] ?? draft.materials[slot];
    if (v) chips.push(`${slot}: ${v}`);
  }
  return chips.slice(0, 3);
}

export type InspectorRow = {
  readonly label: string;
  readonly value: string;
};

export function inspectorRows(
  comp: GenericBuildingComponentV2,
): readonly InspectorRow[] {
  const rows: InspectorRow[] = [];

  switch (comp.type) {
    case "room":
      rows.push(
        { label: "Size", value: `${comp.width} × ${comp.depth}` },
        { label: "Wall height", value: String(comp.wallHeight) },
        { label: "Wall thickness", value: String(comp.wallThickness) },
        {
          label: "Interior",
          value: comp.hollowInterior ? "Hollow" : "Solid",
        },
      );
      break;
    case "roof":
      rows.push(
        { label: "Kind", value: comp.kind },
        { label: "Layers", value: String(comp.layers ?? 1) },
        { label: "Overhang", value: String(comp.overhang ?? 0) },
      );
      if (comp.orientation) {
        rows.push({ label: "Orientation", value: comp.orientation });
      }
      break;
    case "door":
      rows.push(
        { label: "Opening", value: `${comp.width} × ${comp.height}` },
      );
      break;
    case "window_group":
      rows.push(
        { label: "Count", value: String(comp.count) },
        { label: "Layout", value: comp.layout },
        { label: "Height band", value: comp.heightBand ?? "auto" },
      );
      break;
    case "porch":
      rows.push(
        {
          label: "Width mode",
          value:
            comp.widthMode === "full_facade" ? "Full facade" : "Door only",
        },
        { label: "Depth", value: String(comp.depth) },
      );
      if (comp.aroundDoor) {
        rows.push({ label: "Around door", value: comp.aroundDoor });
      }
      break;
    case "chimney":
      rows.push({ label: "Type", value: "Stack on wall" });
      break;
    case "step":
      rows.push({ label: "Target door", value: comp.attach.targetDoor });
      break;
  }

  return rows;
}

export function horizontalPlacement(
  comp: GenericBuildingComponentV2,
): "left" | "center" | "right" | undefined {
  if (
    comp.type === "door" ||
    comp.type === "window_group" ||
    comp.type === "porch" ||
    comp.type === "chimney"
  ) {
    return comp.attach.placement?.horizontal ?? "center";
  }
  return undefined;
}

export function attachedFaceRef(
  comp: GenericBuildingComponentV2,
): string | undefined {
  if (
    comp.type === "door" ||
    comp.type === "window_group" ||
    comp.type === "porch" ||
    comp.type === "chimney"
  ) {
    return comp.attach.targetSurface;
  }
  return undefined;
}

export function findComponent(
  draft: GenericBuildingBlueprintV2Draft,
  id: string,
): GenericBuildingComponentV2 | undefined {
  return draft.components.find((c) => c.id === id);
}

const FACADE_ATTACH_TYPES = new Set<GenericBuildingComponentV2["type"]>([
  "door",
  "window_group",
  "porch",
  "chimney",
]);

export function componentsOnFacadeFace(
  draft: GenericBuildingBlueprintV2Draft,
  face: RoomFace,
): GenericBuildingComponentV2[] {
  if (face === "roof") {
    return draft.components.filter((c) => c.type === "roof");
  }
  return draft.components.filter((c) => {
    if (!FACADE_ATTACH_TYPES.has(c.type)) return false;
    return faceFromComponent(c) === face;
  });
}

export function stepsForDoor(
  draft: GenericBuildingBlueprintV2Draft,
  doorId: string,
): GenericBuildingComponentV2[] {
  return draft.components.filter(
    (c) => c.type === "step" && c.attach.targetDoor === doorId,
  );
}

export function selectedComponentSummaryLine(
  draft: GenericBuildingBlueprintV2Draft,
  componentId: string,
): string {
  const comp = findComponent(draft, componentId);
  if (!comp) return "No selection";
  const parts = [componentDisplayName(comp)];
  const face = faceFromComponent(comp);
  if (face) parts.push(`attached to ${faceDisplayLabel(face)}`);
  if (comp.type === "window_group") parts.push(`${comp.count} windows`);
  if (comp.type === "door") parts.push(`${comp.width}×${comp.height} opening`);
  if (comp.type === "porch") parts.push(`depth ${comp.depth}`);
  return parts.join(" · ");
}
