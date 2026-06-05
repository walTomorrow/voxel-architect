/**
 * ComponentPlan v2 — internal compiler IR only. Not public authoring JSON.
 * Lowering is Phase 3; emitters are Phase 4.
 */

import type { BlueprintConstraints, EntranceSide } from "@/src/lib/blueprints/types";
import type {
  ComponentId,
  HorizontalPlacementV2,
  PorchWidthModeV2,
  RoofKindV2,
  RoomSurfaceRef,
  ShedOrientationV2,
  WindowHeightBandV2,
  WindowLayoutV2,
  WindowTreatmentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";

export type PlanComponentKindV2 =
  | "room_shell"
  | "roof"
  | "door"
  | "window_group"
  | "porch"
  | "chimney"
  | "step";

/** Derived aperture masks — populated by Phase 3 lowering. */
export interface DerivedOpeningsV2 {
  readonly shellSkipMask: ReadonlySet<string>;
  readonly windowMask: ReadonlySet<string>;
  readonly doorMask: ReadonlySet<string>;
  /** Per aperture cell key — how to fill window openings at emit time. */
  readonly windowTreatmentByCellKey: ReadonlyMap<string, WindowTreatmentV2>;
}

export interface PlanBoundsV2 {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly width: number;
  readonly depth: number;
  readonly bodyLayers: number;
  readonly roofLayers: number;
  readonly overhang: number;
}

export interface ResolvedMaterialPaletteV2 {
  readonly wall: BlockTypeId;
  readonly floor: BlockTypeId;
  readonly roof: BlockTypeId;
  readonly window: BlockTypeId;
  readonly door: BlockTypeId;
  readonly accent: BlockTypeId;
}

export interface DoorAperturePlanV2 {
  readonly side: EntranceSide;
  readonly width: number;
  readonly height: number;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
  readonly spanLo: number;
  readonly spanHi: number;
  readonly surfaceRef: RoomSurfaceRef;
}

export interface WindowAperturePlanV2 {
  readonly side: EntranceSide;
  readonly count: number;
  readonly layout: WindowLayoutV2;
  readonly heightBand: WindowHeightBandV2;
  readonly horizontal: HorizontalPlacementV2["horizontal"];
  readonly slots: readonly number[];
  readonly wy: number;
  readonly surfaceRef: RoomSurfaceRef;
  readonly windowTreatment: WindowTreatmentV2;
}

export interface PlanRoomShellV2 {
  readonly kind: "room_shell";
  readonly sourceComponentId: ComponentId;
  readonly params: {
    readonly width: number;
    readonly depth: number;
    readonly wallHeight: number;
    readonly wallThickness: number;
    readonly hollowInterior: boolean;
  };
}

export interface PlanRoofV2 {
  readonly kind: "roof";
  readonly sourceComponentId: ComponentId;
  readonly params: {
    readonly targetRoomId: ComponentId;
    readonly kind: RoofKindV2;
    readonly layers: number;
    readonly overhang: number;
    readonly orientation?: ShedOrientationV2;
  };
}

export interface PlanDoorV2 {
  readonly kind: "door";
  readonly sourceComponentId: ComponentId;
  readonly aperture: DoorAperturePlanV2;
}

export interface PlanWindowGroupV2 {
  readonly kind: "window_group";
  readonly sourceComponentId: ComponentId;
  readonly aperture: WindowAperturePlanV2;
}

export interface PlanPorchV2 {
  readonly kind: "porch";
  readonly sourceComponentId: ComponentId;
  readonly params: {
    readonly surfaceRef: RoomSurfaceRef;
    readonly side: EntranceSide;
    readonly depth: number;
    readonly widthMode: PorchWidthModeV2;
    readonly horizontal: HorizontalPlacementV2["horizontal"];
    readonly aroundDoorId?: ComponentId;
  };
}

export interface PlanChimneyV2 {
  readonly kind: "chimney";
  readonly sourceComponentId: ComponentId;
  readonly params: {
    readonly surfaceRef: RoomSurfaceRef;
    readonly side: EntranceSide;
    readonly horizontal: HorizontalPlacementV2["horizontal"];
  };
}

export interface PlanStepV2 {
  readonly kind: "step";
  readonly sourceComponentId: ComponentId;
  readonly targetDoorId: ComponentId;
  readonly anchor: {
    readonly side: EntranceSide;
    readonly spanLo: number;
    readonly spanHi: number;
    readonly surfaceRef: RoomSurfaceRef;
  };
}

export type PlanComponentV2 =
  | PlanRoomShellV2
  | PlanRoofV2
  | PlanDoorV2
  | PlanWindowGroupV2
  | PlanPorchV2
  | PlanChimneyV2
  | PlanStepV2;

export interface ComponentPlanV2 {
  readonly planVersion: 2;
  readonly sourceSchemaVersion: 2;
  readonly rootRoomId: ComponentId;
  readonly bounds: PlanBoundsV2;
  readonly materials: ResolvedMaterialPaletteV2;
  readonly constraints: BlueprintConstraints;
  readonly openings: DerivedOpeningsV2;
  readonly components: readonly PlanComponentV2[];
  readonly compileNotes?: readonly string[];
}
