import type { ComponentId, RoomFace } from "./types/genericBuildingV2";

export type ParsedRoomSurfaceRef = {
  readonly roomId: ComponentId;
  readonly face: RoomFace;
};

export type ParseRoomSurfaceRefResult =
  | { readonly ok: true; readonly parsed: ParsedRoomSurfaceRef }
  | { readonly ok: false; readonly message: string };

const ROOM_SURFACE_REF_RE =
  /^([a-z][a-z0-9-]*)\.(front|back|left|right|roof)$/;

/**
 * Parse a public `RoomSurfaceRef` string into room id and face.
 * Full surface catalog / resolution is Phase 3.
 */
export function parseRoomSurfaceRef(ref: string): ParseRoomSurfaceRefResult {
  if (typeof ref !== "string" || ref.length === 0) {
    return { ok: false, message: "Surface reference must be a non-empty string." };
  }
  const match = ref.match(ROOM_SURFACE_REF_RE);
  if (!match) {
    return {
      ok: false,
      message: `Invalid surface reference "${ref}". Expected "{room-id}.{front|back|left|right|roof}".`,
    };
  }
  return {
    ok: true,
    parsed: {
      roomId: match[1],
      face: match[2] as RoomFace,
    },
  };
}
