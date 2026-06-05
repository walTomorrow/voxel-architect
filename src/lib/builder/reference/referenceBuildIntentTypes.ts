export type ColorLabel =
  | "warm_tan"
  | "sandstone"
  | "pale_stone"
  | "light_stone"
  | "cream"
  | "gray"
  | "charcoal"
  | "dark_gray"
  | "black"
  | "brown"
  | "red_tile"
  | "white"
  | "unknown";

export type MaterialRoleHint =
  | "light_stone"
  | "sandstone"
  | "warm_stone"
  | "gray_stone"
  | "dark_stone"
  | "dark_cap"
  | "brick"
  | "wood"
  | "pale_accent"
  | "glass"
  | "unknown";

export type ReferenceBuildIntent = {
  readonly source: "text" | "image" | "text_and_image";
  readonly confidence: "low" | "medium" | "high";
  readonly buildingFamily: "landmark_tower" | "generic_building" | "unknown";
  readonly styleTags: readonly string[];
  readonly colorPalette: {
    readonly labels: readonly ColorLabel[];
    readonly summary?: string;
  };
  readonly materialRoles: {
    readonly wall: MaterialRoleHint;
    readonly cap: MaterialRoleHint;
    readonly accent: MaterialRoleHint;
    readonly base: MaterialRoleHint;
    readonly window: MaterialRoleHint;
  };
  readonly silhouette: {
    readonly verticality: "low" | "medium" | "tall" | "very_tall";
    readonly footprint: "narrow" | "medium" | "wide";
    readonly footprintShape: "square" | "octagonal" | "circular_approx" | "unknown";
    readonly base: "same_width" | "slightly_wider" | "much_wider";
    readonly top: "flat" | "dark_cap" | "stepped_crown" | "roofed_crown";
  };
  readonly facade: {
    readonly windowPattern: "few" | "regular_rows" | "vertical_bands" | "narrow_openings" | "unknown";
    readonly windowTreatment: "glass_block" | "glass_pane" | "open" | "unknown";
  };
  readonly notableFeatures: readonly string[];
  readonly rationaleSummary: string;
};
