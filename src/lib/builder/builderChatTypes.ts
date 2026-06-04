export type BuilderChatRole = "user" | "assistant";

/** Future: system-generated canonical render screenshots for self-evaluation. */
export type BuilderImageSource = "user_reference" | "canonical_render";

export type BuilderImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export const BUILDER_IMAGE_MIME_TYPES: readonly BuilderImageMimeType[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Decoded image cap for dev testing (within ~2–4 MB band). */
export const BUILDER_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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
  readonly attachment: BuilderImageAttachmentInput | null;
  readonly currentBlueprint: import("@/src/lib/blueprints/types/genericBuildingV2").GenericBuildingBlueprintV2 | null;
  readonly currentBlockCount?: number;
};

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
