export type BuilderChatRole = "user" | "assistant";

/** Future: system-generated canonical render screenshots for self-evaluation. */
export type BuilderImageSource = "user_reference" | "canonical_render";

export type BuilderImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export const BUILDER_IMAGE_MIME_TYPES: readonly BuilderImageMimeType[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Decoded image cap per attachment (within ~2–4 MB band). */
export const BUILDER_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Max reference images per user message. */
export const BUILDER_MAX_IMAGES_PER_MESSAGE = 4;

/** JSON request body cap — room for up to 4 base64-encoded images. */
export const BUILDER_MAX_REQUEST_BODY_BYTES = 28 * 1024 * 1024;

/** Max conversation turns sent to Workers AI per request (dev guardrail). */
export const BUILDER_MAX_CHAT_MESSAGES = 20;

/** Max combined user+assistant text characters per request (dev guardrail). */
export const BUILDER_MAX_TOTAL_TEXT_CHARS = 10_000;

/** Max characters in a single message. */
export const BUILDER_MAX_MESSAGE_CHARS = 8_000;

export type BuilderChatMessageInput = {
  readonly role: BuilderChatRole;
  readonly content: string;
};

export type BuilderImageAttachmentInput = {
  readonly type: "image";
  readonly source: BuilderImageSource;
  readonly mimeType: BuilderImageMimeType;
  readonly dataBase64: string;
  readonly name: string;
};

export type BuilderChatRequestBody = {
  readonly messages: readonly BuilderChatMessageInput[];
  readonly attachments: readonly BuilderImageAttachmentInput[];
  readonly currentBlueprint: import("@/src/lib/blueprints/types/genericBuildingV2").GenericBuildingBlueprintV2 | null;
  readonly currentBlockCount?: number;
};

export function hasImageAttachments(
  attachments: readonly BuilderImageAttachmentInput[] | null | undefined,
): boolean {
  return (attachments?.length ?? 0) > 0;
}

export type BuilderChatSuccessResponse = {
  readonly message: string;
  readonly model: string;
};

export type BuilderChatWithToolSuccessResponse = {
  readonly message: string;
  readonly model: string;
  readonly toolResult: import("@/src/lib/builder/builderToolTypes").BuilderToolResult;
};

export type BuilderChatErrorCode = "CONFIG" | "VALIDATION" | "UPSTREAM" | "LICENSE";

export type BuilderChatErrorResponse = {
  readonly error: string;
  readonly code: BuilderChatErrorCode;
};
