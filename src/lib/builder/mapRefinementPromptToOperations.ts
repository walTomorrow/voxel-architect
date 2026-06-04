import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlueprintMaterialPalette } from "@/src/lib/blueprints/types/materials";
import type { BlueprintOperationV2 } from "@/src/lib/builder/blueprintOperationsV2";
import {
  findChimney,
  findMainRoof,
  findPorch,
  findPrimaryFrontWindowGroup,
  findRootRoom,
} from "@/src/lib/builder/blueprintComponentIndex";

export type MapRefinementResult =
  | { readonly ok: true; readonly operations: readonly BlueprintOperationV2[]; readonly planLabel: string }
  | { readonly ok: false; readonly reason: string };

function lower(text: string): string {
  return text.toLowerCase();
}

function bump(current: number, delta: number): number {
  return current + delta;
}

function buildMaterialPalettePatch(text: string): Partial<BlueprintMaterialPalette> {
  let wall: BlueprintMaterialPalette["wall"] | undefined;
  let roof: BlueprintMaterialPalette["roof"] | undefined;
  let window: BlueprintMaterialPalette["window"] | undefined;
  let door: BlueprintMaterialPalette["door"] | undefined;

  if (/\b(stone walls?|walls? stone|cobblestone walls?)\b/.test(text)) {
    wall = "cobblestone";
  } else if (/\b(brick walls?|limestone brick)\b/.test(text)) {
    wall = "limestone_bricks";
  } else if (/\b(more stone|stone building)\b/.test(text)) {
    wall = "cobblestone";
  }

  if (/\b(dark wood roof|roof dark wood|wooden roof|wood roof|dark roof)\b/.test(text)) {
    roof = "oak_planks";
  } else if (/\b(slate roof)\b/.test(text)) {
    roof = "slate_tiles";
  }

  if (/\b(glass windows?|windows? glass)\b/.test(text)) {
    window = "glass";
  }

  if (/\b(more wooden|wooden building|wood walls?)\b/.test(text)) {
    wall = "oak_planks";
    door = "oak_planks";
  }

  return {
    ...(wall !== undefined ? { wall } : {}),
    ...(roof !== undefined ? { roof } : {}),
    ...(window !== undefined ? { window } : {}),
    ...(door !== undefined ? { door } : {}),
  };
}

export function mapRefinementPromptToOperations(
  prompt: string,
  blueprint: GenericBuildingBlueprintV2,
): MapRefinementResult {
  const text = lower(prompt);

  if (/\b(wider porch|porch wider)\b/.test(text)) {
    return {
      ok: false,
      reason:
        "Making the porch wider is not supported yet. You can ask to make the porch deeper.",
    };
  }

  if (/\b(remove porch|remove chimney|add porch|add a porch)\b/.test(text)) {
    return {
      ok: false,
      reason: "Adding or removing components is not supported yet.",
    };
  }

  // --- Materials (palette) ---
  const palettePatch = buildMaterialPalettePatch(text);
  if (Object.keys(palettePatch).length > 0) {
    const labels = Object.keys(palettePatch).join(", ");
    return {
      ok: true,
      operations: [{ op: "setMaterialPalette", patch: palettePatch }],
      planLabel: `Update material palette (${labels})`,
    };
  }

  // --- Room dimensions ---
  const room = findRootRoom(blueprint);
  if (room) {
    if (/\b(make it )?(wider|more wide)\b/.test(text) || /\bwider\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: { type: "room", width: bump(room.width, 1) },
          },
        ],
        planLabel: "Increase room width",
      };
    }
    if (/\b(narrower|more narrow|less wide)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: { type: "room", width: bump(room.width, -1) },
          },
        ],
        planLabel: "Decrease room width",
      };
    }
    if (/\b(deeper|more deep)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: { type: "room", depth: bump(room.depth, 1) },
          },
        ],
        planLabel: "Increase room depth",
      };
    }
    if (/\b(shallower|less deep)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: { type: "room", depth: bump(room.depth, -1) },
          },
        ],
        planLabel: "Decrease room depth",
      };
    }
    if (/\b(taller|higher|make it tall)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: { type: "room", wallHeight: bump(room.wallHeight, 1) },
          },
        ],
        planLabel: "Increase wall height",
      };
    }
    if (/\b(shorter|lower|make it short)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: { type: "room", wallHeight: bump(room.wallHeight, -1) },
          },
        ],
        planLabel: "Decrease wall height",
      };
    }
    if (/\b(larger|bigger)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: {
              type: "room",
              width: bump(room.width, 1),
              depth: bump(room.depth, 1),
            },
          },
        ],
        planLabel: "Increase room width and depth",
      };
    }
    if (/\b(smaller)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: room.id,
            componentType: "room",
            patch: {
              type: "room",
              width: bump(room.width, -1),
              depth: bump(room.depth, -1),
            },
          },
        ],
        planLabel: "Decrease room width and depth",
      };
    }
  }

  // --- Roof ---
  const roof = findMainRoof(blueprint);
  if (roof) {
    if (/\b(shed roof)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: roof.id,
            componentType: "roof",
            patch: {
              type: "roof",
              kind: "shed",
              orientation: roof.orientation ?? "front_back",
            },
          },
        ],
        planLabel: "Switch to shed roof",
      };
    }
    if (/\b(gable roof|pitched roof|peaked roof)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: roof.id,
            componentType: "roof",
            patch: { type: "roof", kind: "pitched_gable" },
          },
        ],
        planLabel: "Switch to gable roof",
      };
    }
    if (/\b(steeper|more layers|taller roof)\b/.test(text)) {
      const layers = (roof.layers ?? 2) + 1;
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: roof.id,
            componentType: "roof",
            patch: { type: "roof", layers },
          },
        ],
        planLabel: "Increase roof layers",
      };
    }
    if (/\b(flatter|fewer layers|shorter roof)\b/.test(text)) {
      const layers = (roof.layers ?? 2) - 1;
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: roof.id,
            componentType: "roof",
            patch: { type: "roof", layers },
          },
        ],
        planLabel: "Decrease roof layers",
      };
    }
  }

  // --- Front windows ---
  const windows = findPrimaryFrontWindowGroup(blueprint);
  if (windows) {
    if (/\b(more windows|add windows|extra windows)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: windows.id,
            componentType: "window_group",
            patch: { type: "window_group", count: windows.count + 1 },
          },
        ],
        planLabel: "Add front window",
      };
    }
    if (/\b(fewer windows|less windows|remove a window)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: windows.id,
            componentType: "window_group",
            patch: { type: "window_group", count: windows.count - 1 },
          },
        ],
        planLabel: "Remove front window",
      };
    }
  }

  // --- Porch depth ---
  const porch = findPorch(blueprint);
  if (porch && /\b(deeper porch|porch deeper|extend porch|extend the porch)\b/.test(text)) {
    return {
      ok: true,
      operations: [
        {
          op: "updateComponent",
          id: porch.id,
          componentType: "porch",
          patch: { type: "porch", depth: porch.depth + 1 },
        },
      ],
      planLabel: "Increase porch depth",
    };
  }

  // --- Chimney ---
  const chimney = findChimney(blueprint);
  if (chimney) {
    if (/\b(chimney.*left|move chimney.*left)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: chimney.id,
            componentType: "chimney",
            patch: { type: "chimney", placementHorizontal: "left" },
          },
        ],
        planLabel: "Move chimney left",
      };
    }
    if (/\b(chimney.*right|move chimney.*right)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: chimney.id,
            componentType: "chimney",
            patch: { type: "chimney", placementHorizontal: "right" },
          },
        ],
        planLabel: "Move chimney right",
      };
    }
    if (/\b(chimney.*back|move chimney.*back)\b/.test(text)) {
      return {
        ok: true,
        operations: [
          {
            op: "updateComponent",
            id: chimney.id,
            componentType: "chimney",
            patch: { type: "chimney", targetFace: "back" },
          },
        ],
        planLabel: "Move chimney to back",
      };
    }
  }

  return {
    ok: false,
    reason:
      "I couldn't map that request to a supported refinement yet. Try material changes, making the building taller/wider, roof adjustments, front windows, porch depth, or chimney placement.",
  };
}
