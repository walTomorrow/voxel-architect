import type {
  GenericBuildingComponentTypeV2,
  RoofKindV2,
  RoomFace,
  ShedOrientationV2,
  WindowLayoutV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  BlueprintMaterialPalette,
  ComponentMaterialOverride,
} from "@/src/lib/blueprints/types/materials";

export type ComponentPatchV2 =
  | { readonly type: "room"; readonly width?: number; readonly depth?: number; readonly wallHeight?: number }
  | {
      readonly type: "roof";
      readonly kind?: RoofKindV2;
      readonly layers?: number;
      readonly overhang?: number;
      readonly orientation?: ShedOrientationV2;
    }
  | {
      readonly type: "window_group";
      readonly count?: number;
      readonly layout?: WindowLayoutV2;
    }
  | { readonly type: "porch"; readonly depth?: number }
  | {
      readonly type: "chimney";
      readonly targetFace?: RoomFace;
      readonly placementHorizontal?: "left" | "center" | "right";
    };

export type BlueprintOperationV2 =
  | {
      readonly op: "updateComponent";
      readonly id: string;
      readonly componentType: GenericBuildingComponentTypeV2;
      readonly patch: ComponentPatchV2;
    }
  | {
      readonly op: "setMaterialPalette";
      readonly patch: Partial<BlueprintMaterialPalette>;
    }
  | {
      readonly op: "setMaterialOverride";
      readonly id: string;
      readonly materials: ComponentMaterialOverride;
    };

export type ApplyOperationsErrorCode =
  | "UNKNOWN_COMPONENT"
  | "TYPE_MISMATCH"
  | "UNSUPPORTED_FIELD"
  | "INVALID_VALUE";

export type ApplyOperationsResult =
  | { readonly ok: true; readonly appliedLabels: readonly string[] }
  | {
      readonly ok: false;
      readonly error: string;
      readonly code: ApplyOperationsErrorCode;
    };
