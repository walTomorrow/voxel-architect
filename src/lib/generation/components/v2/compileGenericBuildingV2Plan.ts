import type { ResolvedGenericBuildingV2 } from "@/src/lib/blueprints/types/resolvedGenericBuildingV2";
import { deriveApertureMasksV2 } from "./deriveApertureMasksV2";
import type { ComponentPlanV2, PlanComponentV2 } from "./types";

/**
 * Lower a resolved v2 semantic graph into ComponentPlanV2 (no voxels).
 */
export function compileGenericBuildingV2Plan(
  resolved: ResolvedGenericBuildingV2,
): ComponentPlanV2 {
  const compileNotes: string[] = [];
  const components: PlanComponentV2[] = [];

  const rootRoom = resolved.components.find(
    (c) => c.id === resolved.rootRoomId && c.type === "room",
  );
  if (!rootRoom || rootRoom.type !== "room") {
    throw new Error(`Root room "${resolved.rootRoomId}" missing from resolved components.`);
  }

  components.push({
    kind: "room_shell",
    sourceComponentId: rootRoom.id,
    params: {
      width: rootRoom.width,
      depth: rootRoom.depth,
      wallHeight: rootRoom.wallHeight,
      wallThickness: rootRoom.wallThickness,
      hollowInterior: rootRoom.hollowInterior,
    },
  });

  for (const comp of resolved.components) {
    switch (comp.type) {
      case "door":
        components.push({
          kind: "door",
          sourceComponentId: comp.id,
          aperture: {
            side: comp.aperture.side,
            width: comp.aperture.width,
            height: comp.aperture.height,
            horizontal: comp.aperture.horizontal,
            spanLo: comp.aperture.spanLo,
            spanHi: comp.aperture.spanHi,
            surfaceRef: comp.aperture.surfaceRef,
          },
        });
        break;
      case "window_group":
        components.push({
          kind: "window_group",
          sourceComponentId: comp.id,
          aperture: {
            side: comp.aperture.side,
            count: comp.aperture.count,
            layout: comp.aperture.layout,
            heightBand: comp.aperture.heightBand,
            horizontal: comp.aperture.horizontal,
            slots: comp.aperture.slots,
            wy: comp.aperture.wy,
            surfaceRef: comp.aperture.surfaceRef,
          },
        });
        break;
      case "roof":
        components.push({
          kind: "roof",
          sourceComponentId: comp.id,
          params: {
            targetRoomId: comp.targetRoom,
            kind: comp.kind,
            layers: comp.layers,
            overhang: comp.overhang,
            orientation: comp.orientation,
          },
        });
        break;
      case "porch":
        components.push({
          kind: "porch",
          sourceComponentId: comp.id,
          params: {
            surfaceRef: comp.surfaceRef,
            side: comp.side,
            depth: comp.depth,
            widthMode: comp.widthMode,
            horizontal: comp.horizontal,
            aroundDoorId: comp.aroundDoorId,
          },
        });
        break;
      case "chimney":
        components.push({
          kind: "chimney",
          sourceComponentId: comp.id,
          params: {
            surfaceRef: comp.surfaceRef,
            side: comp.side,
            horizontal: comp.horizontal,
          },
        });
        break;
      case "step":
        components.push({
          kind: "step",
          sourceComponentId: comp.id,
          targetDoorId: comp.targetDoorId,
          anchor: {
            side: comp.anchor.side,
            spanLo: comp.anchor.spanLo,
            spanHi: comp.anchor.spanHi,
            surfaceRef: comp.anchor.surfaceRef,
          },
        });
        break;
      case "room":
        break;
      default:
        compileNotes.push(`Skipped unknown resolved component type.`);
    }
  }

  const openings = deriveApertureMasksV2(resolved);

  return {
    planVersion: 2,
    sourceSchemaVersion: 2,
    rootRoomId: resolved.rootRoomId,
    bounds: resolved.grid,
    materials: resolved.materials,
    constraints: resolved.constraints,
    openings,
    components,
    compileNotes: compileNotes.length > 0 ? compileNotes : undefined,
  };
}
