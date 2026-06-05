/**
 * Internal resolved semantic graph for schemaVersion 2 (not public authoring JSON).
 */

import type { BlueprintConstraints, BlueprintMetadata, EntranceSide } from "../types";
import type {
  ComponentId,
  HorizontalPlacementV2,
  PorchWidthModeV2,
  RoofKindV2,
  RoomFace,
  RoomSurfaceRef,
  ShedOrientationV2,
  WindowHeightBandV2,
  WindowLayoutV2,
  WindowTreatmentV2,
} from "./genericBuildingV2";
import type { PlanBoundsV2, ResolvedMaterialPaletteV2 } from "@/src/lib/generation/components/v2/types";

export interface ResolvedRoomSurfaceV2 {
  readonly ref: RoomSurfaceRef;
  readonly roomId: ComponentId;
  readonly face: RoomFace;
  /** Wall façade side; `null` for `roof`. */
  readonly side: EntranceSide | null;
  readonly interiorLo: number;
  readonly interiorHi: number;
  readonly axis: "x" | "z";
}

export interface ResolvedDoorAnchorV2 {
  readonly doorId: ComponentId;
  readonly surfaceRef: RoomSurfaceRef;
  readonly side: EntranceSide;
  readonly width: number;
  readonly height: number;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
  readonly spanLo: number;
  readonly spanHi: number;
}

export interface ResolvedDoorApertureV2 {
  readonly doorId: ComponentId;
  readonly surfaceRef: RoomSurfaceRef;
  readonly side: EntranceSide;
  readonly width: number;
  readonly height: number;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
  readonly spanLo: number;
  readonly spanHi: number;
}

export interface ResolvedWindowApertureV2 {
  readonly windowGroupId: ComponentId;
  readonly surfaceRef: RoomSurfaceRef;
  readonly side: EntranceSide;
  readonly count: number;
  readonly layout: WindowLayoutV2;
  readonly heightBand: WindowHeightBandV2;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
  readonly slots: readonly number[];
  readonly wy: number;
  readonly windowTreatment: WindowTreatmentV2;
}

export interface ResolvedFacadeOpeningsV2 {
  readonly side: EntranceSide;
  readonly doors: readonly ResolvedDoorApertureV2[];
  readonly windows: readonly ResolvedWindowApertureV2[];
}

export interface ResolvedRoomV2 {
  readonly id: ComponentId;
  readonly type: "room";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly width: number;
  readonly depth: number;
  readonly wallHeight: number;
  readonly wallThickness: number;
  readonly hollowInterior: boolean;
  readonly role?: "root";
}

export interface ResolvedRoofV2 {
  readonly id: ComponentId;
  readonly type: "roof";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly targetRoom: ComponentId;
  readonly kind: RoofKindV2;
  readonly layers: number;
  readonly overhang: number;
  readonly orientation?: ShedOrientationV2;
}

export interface ResolvedDoorV2 {
  readonly id: ComponentId;
  readonly type: "door";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly aperture: ResolvedDoorApertureV2;
}

export interface ResolvedWindowGroupV2 {
  readonly id: ComponentId;
  readonly type: "window_group";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly aperture: ResolvedWindowApertureV2;
}

export interface ResolvedPorchV2 {
  readonly id: ComponentId;
  readonly type: "porch";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly surfaceRef: RoomSurfaceRef;
  readonly side: EntranceSide;
  readonly depth: number;
  readonly widthMode: PorchWidthModeV2;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
  readonly aroundDoorId?: ComponentId;
}

export interface ResolvedChimneyV2 {
  readonly id: ComponentId;
  readonly type: "chimney";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly surfaceRef: RoomSurfaceRef;
  readonly side: EntranceSide;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
}

export interface ResolvedStepV2 {
  readonly id: ComponentId;
  readonly type: "step";
  readonly materials: ResolvedMaterialPaletteV2;
  readonly targetDoorId: ComponentId;
  readonly anchor: ResolvedDoorAnchorV2;
}

export type ResolvedComponentV2 =
  | ResolvedRoomV2
  | ResolvedRoofV2
  | ResolvedDoorV2
  | ResolvedWindowGroupV2
  | ResolvedPorchV2
  | ResolvedChimneyV2
  | ResolvedStepV2;

export interface ResolvedGenericBuildingV2 {
  readonly structureType: "generic_building";
  readonly schemaVersion: 2;
  readonly metadata: BlueprintMetadata;
  readonly constraints: BlueprintConstraints;
  readonly rootRoomId: ComponentId;
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly grid: PlanBoundsV2;
  readonly materials: ResolvedMaterialPaletteV2;
  readonly surfaces: ReadonlyMap<RoomSurfaceRef, ResolvedRoomSurfaceV2>;
  readonly anchors: ReadonlyMap<ComponentId, ResolvedDoorAnchorV2>;
  readonly openingsByFacade: ReadonlyMap<EntranceSide, ResolvedFacadeOpeningsV2>;
  readonly components: readonly ResolvedComponentV2[];
}
