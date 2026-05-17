import type { ResolvedGenericBuilding } from "@/src/lib/blueprints/types";
import { deriveOpeningsForGenericBuilding } from "./geometry/openingMask";
import type { ComponentPlan, PlannedComponent } from "./types";

export function compileGenericBuildingToComponentPlan(
  resolved: ResolvedGenericBuilding,
): ComponentPlan {
  const openings = deriveOpeningsForGenericBuilding(resolved);
  const components: PlannedComponent[] = [
    {
      id: "body_main",
      kind: "rectangular_body",
      target: "body_main",
      params: {
        width: resolved.body.width,
        depth: resolved.body.depth,
        height: resolved.body.height,
        wallThickness: resolved.body.wallThickness,
        hollowInterior: resolved.body.hollowInterior,
      },
    },
    {
      id: "foundation_main",
      kind: "foundation",
      target: "body_main",
      params: {},
    },
    {
      id: "shell_main",
      kind: "hollow_wall_shell",
      target: "body_main",
      params: {
        wallThickness: resolved.body.wallThickness,
        hollowInterior: resolved.body.hollowInterior,
      },
    },
    {
      id: "entrance_main",
      kind: "entrance_on_side",
      target: "body_main",
      params: {
        side: resolved.openings.entrance.side,
        width: resolved.openings.entrance.width,
        height: resolved.openings.entrance.height,
      },
    },
  ];

  if (
    resolved.openings.windows.mode !== "none" &&
    resolved.openings.windows.count > 0
  ) {
    components.push({
      id: "windows_main",
      kind: "sparse_windows",
      target: "body_main",
      params: {
        mode: resolved.openings.windows.mode,
        count: resolved.openings.windows.count,
      },
    });
  }

  if (resolved.roof.kind === "pitched_gable" && resolved.roof.layers > 0) {
    components.push({
      id: "roof_main",
      kind: "pitched_gable_roof",
      target: "body_main",
      params: {
        layers: resolved.roof.layers,
        overhang: resolved.roof.overhang,
      },
    });
  } else if (resolved.roof.kind === "shed" && resolved.roof.layers > 0) {
    components.push({
      id: "roof_main",
      kind: "shed_roof",
      target: "body_main",
      params: {
        layers: resolved.roof.layers,
        overhang: resolved.roof.overhang,
      },
    });
  }

  if (resolved.features.chimney.enabled) {
    components.push({
      id: "chimney_main",
      kind: "chimney",
      target: "body_main",
      params: { side: resolved.features.chimney.side },
    });
  }

  if (resolved.features.frontStep.enabled) {
    components.push({
      id: "front_step_main",
      kind: "front_step",
      target: "entrance_main",
      params: {},
    });
  }

  return {
    planVersion: 1,
    sourceStructureType: "generic_building",
    materials: resolved.materials,
    constraints: resolved.constraints,
    grid: resolved.grid,
    openings,
    components,
  };
}
