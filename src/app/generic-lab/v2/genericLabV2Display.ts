import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type {
  GenericBuildingComponentV2,
  GenericBuildingComponentTypeV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import { parseRoomSurfaceRef } from "@/src/lib/blueprints/parseRoomSurfaceRef";
import { findRootRoom } from "@/src/app/generic-lab/v2/genericLabV2Utils";

export type IssueTone = "ok" | "warn" | "error";

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

export function countFaceIssues(
  issues: readonly ValidationIssue[],
  face: RoomFace,
  draft: GenericBuildingBlueprintV2Draft,
): number {
  const suffix = `.${face}`;
  const onFace = draft.components.filter((c) => {
    const f = faceFromComponent(c);
    return f === face;
  });
  const ids = new Set(onFace.map((c) => c.id));
  return issues.filter(
    (i) =>
      i.surface?.endsWith(suffix) ||
      (i.componentId != null && ids.has(i.componentId)),
  ).length;
}

export function worstIssueTone(issues: readonly ValidationIssue[]): IssueTone {
  if (issues.some((i) => i.severity === "error")) return "error";
  if (issues.some((i) => i.severity === "warning")) return "warn";
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
  return undefined;
}

export function facadeSurfaceRef(
  draft: GenericBuildingBlueprintV2Draft,
  face: RoomFace,
): RoomSurfaceRef | null {
  if (face === "roof") return null;
  const room = findRootRoom(draft);
  if (!room) return null;
  return `${room.id}.${face}` as RoomSurfaceRef;
}

export function materialChipsForComponent(
  draft: GenericBuildingBlueprintV2Draft,
  comp: GenericBuildingComponentV2,
): string[] {
  const chips: string[] = [];
  const slots = ["wall", "floor", "roof", "window", "door", "accent"] as const;
  for (const slot of slots) {
    const override = comp.materials?.[slot];
    if (override) chips.push(`${slot}: ${override}`);
    else if (comp.type === "room" || comp.type === "roof") {
      chips.push(`${slot}: ${draft.materials[slot]}`);
    }
  }
  return chips.slice(0, 3);
}

export const TYPE_META: Record<
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

export function horizontalPlacementLabel(h: "left" | "center" | "right"): string {
  return h.charAt(0).toUpperCase() + h.slice(1);
}

export type SelectedComponentPreview = {
  readonly name: string;
  readonly id: string;
  readonly attachment: string | null;
  readonly details: string;
};

export function buildSelectedComponentPreview(
  draft: GenericBuildingBlueprintV2Draft,
  componentId: string,
): SelectedComponentPreview | null {
  const comp = draft.components.find((c) => c.id === componentId);
  if (!comp) return null;

  const name = componentDisplayName(comp);
  const face = faceFromComponent(comp);
  const attachment = face ? `Attached to ${faceDisplayLabel(face)}` : null;

  const detailParts: string[] = [];

  switch (comp.type) {
    case "window_group": {
      const band = comp.heightBand ?? "auto";
      const bandLabel = band === "auto" ? "auto height" : band;
      detailParts.unshift(
        `${comp.count} window${comp.count === 1 ? "" : "s"}`,
        comp.layout,
        bandLabel,
      );
      break;
    }
    case "door":
      detailParts.unshift(`${comp.width}×${comp.height} opening`);
      break;
    case "porch":
      detailParts.unshift(`depth ${comp.depth}`);
      if (comp.widthMode) detailParts.push(comp.widthMode.replace("_", " "));
      break;
    case "chimney": {
      const h = comp.attach.placement?.horizontal;
      if (h) detailParts.unshift(horizontalPlacementLabel(h));
      break;
    }
    case "room":
      detailParts.unshift(`${comp.width}×${comp.depth} · wall ${comp.wallHeight}`);
      break;
    case "roof":
      detailParts.unshift(comp.kind);
      if (comp.layers != null) detailParts.push(`${comp.layers} layer${comp.layers === 1 ? "" : "s"}`);
      break;
    case "step":
      detailParts.unshift(`→ ${comp.attach.targetDoor}`);
      break;
    default:
      break;
  }

  const details = detailParts.join(" · ");

  return { name, id: comp.id, attachment, details };
}
