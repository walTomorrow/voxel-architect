import type {
  ChimneyComponentV2,
  DoorComponentV2,
  GenericBuildingBlueprintV2,
  GenericBuildingComponentV2,
  PorchComponentV2,
  RoomComponentV2,
  RoofComponentV2,
  WindowGroupComponentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";

export function findComponentById(
  blueprint: GenericBuildingBlueprintV2,
  id: string,
): GenericBuildingComponentV2 | undefined {
  return blueprint.components.find((c) => c.id === id);
}

export function findRootRoom(
  blueprint: GenericBuildingBlueprintV2,
): RoomComponentV2 | undefined {
  const room =
    blueprint.components.find((c) => c.type === "room" && c.role === "root") ??
    blueprint.components.find((c) => c.type === "room");
  return room?.type === "room" ? room : undefined;
}

export function findMainRoof(
  blueprint: GenericBuildingBlueprintV2,
): RoofComponentV2 | undefined {
  const room = findRootRoom(blueprint);
  if (!room) return undefined;
  const roof = blueprint.components.find(
    (c): c is RoofComponentV2 => c.type === "roof" && c.targetRoom === room.id,
  );
  return roof;
}

/** Primary front façade window group (first on main-room.front). */
export function findPrimaryFrontWindowGroup(
  blueprint: GenericBuildingBlueprintV2,
): WindowGroupComponentV2 | undefined {
  const room = findRootRoom(blueprint);
  if (!room) return undefined;
  const target = `${room.id}.front`;
  return blueprint.components.find(
    (c): c is WindowGroupComponentV2 =>
      c.type === "window_group" && c.attach.targetSurface === target,
  );
}

export function findPorch(blueprint: GenericBuildingBlueprintV2): PorchComponentV2 | undefined {
  const c = blueprint.components.find((x) => x.type === "porch");
  return c?.type === "porch" ? c : undefined;
}

export function findChimney(
  blueprint: GenericBuildingBlueprintV2,
): ChimneyComponentV2 | undefined {
  const c = blueprint.components.find((x) => x.type === "chimney");
  return c?.type === "chimney" ? c : undefined;
}

export function findFrontDoor(
  blueprint: GenericBuildingBlueprintV2,
): DoorComponentV2 | undefined {
  const room = findRootRoom(blueprint);
  if (!room) return undefined;
  const target = `${room.id}.front`;
  return blueprint.components.find(
    (c): c is DoorComponentV2 =>
      c.type === "door" && c.attach.targetSurface === target,
  );
}
