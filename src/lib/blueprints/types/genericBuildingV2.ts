import type {
  BlueprintConstraints,
  BlueprintMetadata,
} from "../types";
import type {
  BlueprintMaterialPalette,
  ComponentMaterialOverride,
} from "./materials";

/** Canonical programmatic component identity (slug). Full validation in Phase 2. */
export type ComponentId = string;

export type RoomFace = "front" | "back" | "left" | "right" | "roof";

/** Public authoring surface reference, e.g. `main-room.front`. */
export type RoomSurfaceRef = `${ComponentId}.${RoomFace}`;

export type HorizontalPlacementV2 = {
  readonly horizontal: "left" | "center" | "right";
};

export interface SurfaceAttachment {
  readonly targetSurface: RoomSurfaceRef;
  readonly placement?: HorizontalPlacementV2;
}

export interface DoorAttachment {
  readonly targetDoor: ComponentId;
}

export type GenericBuildingComponentTypeV2 =
  | "room"
  | "roof"
  | "door"
  | "window_group"
  | "porch"
  | "chimney"
  | "step";

export interface ComponentBaseV2 {
  readonly id: ComponentId;
  readonly type: GenericBuildingComponentTypeV2;
  /** Display-only; not used for references. */
  readonly label?: string;
  readonly materials?: ComponentMaterialOverride;
}

export interface RoomComponentV2 extends ComponentBaseV2 {
  readonly type: "room";
  readonly width: number;
  readonly depth: number;
  /** Wall layers above foundation (excludes roof). */
  readonly wallHeight: number;
  readonly wallThickness: number;
  readonly hollowInterior: boolean;
  readonly role?: "root";
}

export type RoofKindV2 = "pitched_gable" | "shed" | "none";

export type ShedOrientationV2 = "front_back" | "left_right";

export interface RoofComponentV2 extends ComponentBaseV2 {
  readonly type: "roof";
  readonly targetRoom: ComponentId;
  readonly kind: RoofKindV2;
  readonly layers?: number;
  readonly overhang?: number;
  readonly orientation?: ShedOrientationV2;
}

export interface DoorComponentV2 extends ComponentBaseV2 {
  readonly type: "door";
  readonly attach: SurfaceAttachment;
  readonly width: number;
  readonly height: number;
}

export type WindowLayoutV2 = "symmetric" | "even";

export type WindowHeightBandV2 = "auto" | "mid" | "upper";

export interface WindowGroupComponentV2 extends ComponentBaseV2 {
  readonly type: "window_group";
  readonly attach: SurfaceAttachment;
  readonly count: number;
  readonly layout: WindowLayoutV2;
  readonly heightBand?: WindowHeightBandV2;
}

export type PorchWidthModeV2 = "door_only" | "full_facade";

export interface PorchComponentV2 extends ComponentBaseV2 {
  readonly type: "porch";
  readonly attach: SurfaceAttachment;
  readonly depth: number;
  readonly widthMode: PorchWidthModeV2;
  readonly aroundDoor?: ComponentId;
}

export interface ChimneyComponentV2 extends ComponentBaseV2 {
  readonly type: "chimney";
  readonly attach: SurfaceAttachment;
}

export interface StepComponentV2 extends ComponentBaseV2 {
  readonly type: "step";
  readonly attach: DoorAttachment;
}

export type GenericBuildingComponentV2 =
  | RoomComponentV2
  | RoofComponentV2
  | DoorComponentV2
  | WindowGroupComponentV2
  | PorchComponentV2
  | ChimneyComponentV2
  | StepComponentV2;

/**
 * Public authoring blueprint for generic_building schemaVersion 2.
 * Validate via Phase 2 validator; generate via Phase 4 pipeline.
 */
export interface GenericBuildingBlueprintV2 {
  readonly structureType: "generic_building";
  readonly schemaVersion: 2;
  readonly metadata: BlueprintMetadata;
  readonly materials: BlueprintMaterialPalette;
  readonly constraints: BlueprintConstraints;
  readonly components: readonly GenericBuildingComponentV2[];
}
