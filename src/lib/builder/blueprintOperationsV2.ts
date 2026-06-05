import type {
  ComponentId,
  GenericBuildingComponentTypeV2,
  HorizontalPlacementV2,
  PorchWidthModeV2,
  RoofKindV2,
  RoomFace,
  RoomSurfaceRef,
  ShedOrientationV2,
  WindowLayoutV2,
  WindowTreatmentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  BlueprintMaterialPalette,
  ComponentMaterialOverride,
} from "@/src/lib/blueprints/types/materials";
import type { GenericBuildingComponentV2 } from "@/src/lib/blueprints/types/genericBuildingV2";

/** Phase-1 components the planner may request via addComponent intent. */
export type AddableComponentKind = "porch" | "chimney" | "window_group";

export type RemovableComponentKind = AddableComponentKind;

export type AddComponentOptions =
  | { readonly kind: "porch"; readonly depth?: number; readonly widthMode?: PorchWidthModeV2 }
  | {
      readonly kind: "chimney";
      readonly placementHorizontal?: HorizontalPlacementV2["horizontal"];
    }
  | {
      readonly kind: "window_group";
      readonly count?: number;
      readonly layout?: WindowLayoutV2;
      readonly windowTreatment?: WindowTreatmentV2;
    };

/** Planner-facing add intent (Option B). Server materializes to full component. */
export type AddComponentIntentOperation = {
  readonly op: "addComponent";
  readonly componentType: AddableComponentKind;
  readonly id?: string;
  readonly targetSurface?: RoomSurfaceRef;
  readonly placement?: HorizontalPlacementV2["horizontal"];
  readonly options?: AddComponentOptions;
};

export type RemoveComponentOperation = {
  readonly op: "removeComponent";
  readonly id: ComponentId;
};

/** Canonical add after materialization (apply layer). */
export type AddComponentOperation = {
  readonly op: "addComponent";
  readonly component: GenericBuildingComponentV2;
};

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
      readonly windowTreatment?: WindowTreatmentV2;
    }
  | {
      readonly type: "porch";
      readonly depth?: number;
      readonly widthMode?: PorchWidthModeV2;
      readonly aroundDoor?: ComponentId | null;
    }
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
    }
  | AddComponentIntentOperation
  | AddComponentOperation
  | RemoveComponentOperation;

/** Operations ready for applyBlueprintOperationsV2 (add intents materialized). */
export type ApplyableBlueprintOperationV2 = Exclude<
  BlueprintOperationV2,
  AddComponentIntentOperation
>;

export function isAddComponentIntent(
  op: BlueprintOperationV2,
): op is AddComponentIntentOperation {
  return op.op === "addComponent" && !("component" in op);
}

export type ApplyOperationsErrorCode =
  | "UNKNOWN_COMPONENT"
  | "TYPE_MISMATCH"
  | "UNSUPPORTED_FIELD"
  | "INVALID_VALUE"
  | "DUPLICATE_COMPONENT"
  | "ADD_NOT_ALLOWED"
  | "NOT_REMOVABLE";

export type ApplyOperationsResult =
  | { readonly ok: true; readonly appliedLabels: readonly string[] }
  | {
      readonly ok: false;
      readonly error: string;
      readonly code: ApplyOperationsErrorCode;
    };
