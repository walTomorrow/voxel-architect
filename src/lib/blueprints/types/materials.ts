import type { ClassicMaterialKey } from "../types";

/** Blueprint-level material palette (all roles required). */
export interface BlueprintMaterialPalette {
  readonly wall: ClassicMaterialKey;
  readonly floor: ClassicMaterialKey;
  readonly roof: ClassicMaterialKey;
  readonly window: ClassicMaterialKey;
  readonly door: ClassicMaterialKey;
  readonly accent: ClassicMaterialKey;
}

/** Per-component material overrides (partial palette). */
export type ComponentMaterialOverride = Partial<BlueprintMaterialPalette>;
