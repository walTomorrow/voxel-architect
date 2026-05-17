/** Merge priority for generic component generators (higher wins per cell). */
export const COMPONENT_PRI = {
  FOUNDATION: 10,
  FRONT_STEP: 15,
  INTERIOR_FLOOR: 20,
  WALL: 30,
  ROOF: 40,
  CHIMNEY: 42,
  WINDOW: 50,
  DOOR_OR_TRIM: 55,
} as const;
