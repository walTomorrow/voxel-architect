import { prepareMessagesForChatApi } from "@/src/lib/builder/builderChatGuardrails";
import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  BUILDER_IMAGE_MIME_TYPES,
  BUILDER_MAX_CHAT_MESSAGES,
  BUILDER_MAX_IMAGE_BYTES,
  BUILDER_MAX_MESSAGE_CHARS,
  type BuilderChatMessageInput,
  type BuilderChatRequestBody,
  type BuilderImageAttachmentInput,
  type BuilderImageMimeType,
} from "@/src/lib/builder/builderChatTypes";
import { parseCurrentBlueprintV2 } from "@/src/lib/builder/parseCurrentBlueprint";

const MAX_NAME_CHARS = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseMimeType(v: unknown): BuilderImageMimeType | null {
  if (typeof v !== "string") return null;
  return (BUILDER_IMAGE_MIME_TYPES as readonly string[]).includes(v)
    ? (v as BuilderImageMimeType)
    : null;
}

function estimateBase64DecodedBytes(base64: string): number {
  const trimmed = base64.replace(/\s/g, "");
  const padding = trimmed.endsWith("==") ? 2 : trimmed.endsWith("=") ? 1 : 0;
  return Math.floor((trimmed.length * 3) / 4) - padding;
}

export function parseBuilderChatRequestBody(
  body: unknown,
): { ok: true; data: BuilderChatRequestBody } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array." };
  }
  if (rawMessages.length > BUILDER_MAX_CHAT_MESSAGES) {
    return {
      ok: false,
      error: `Too many messages (max ${BUILDER_MAX_CHAT_MESSAGES}).`,
    };
  }

  const parsedMessages: BuilderChatMessageInput[] = [];
  for (const item of rawMessages) {
    if (!isRecord(item)) {
      return { ok: false, error: "Each message must be an object." };
    }
    const role = item.role;
    const content = item.content;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "Message role must be user or assistant." };
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return { ok: false, error: "Message content must be a non-empty string." };
    }
    if (content.length > BUILDER_MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        error: `Message content exceeds ${BUILDER_MAX_MESSAGE_CHARS} characters.`,
      };
    }
    parsedMessages.push({ role, content: content.trim() });
  }

  const prepared = prepareMessagesForChatApi(parsedMessages);
  if (!prepared.ok) {
    return { ok: false, error: prepared.error };
  }
  const messages = prepared.messages;

  let attachment: BuilderImageAttachmentInput | null = null;
  if (body.attachment != null) {
    if (!isRecord(body.attachment)) {
      return { ok: false, error: "attachment must be an object or null." };
    }
    const a = body.attachment;
    if (a.type !== "image") {
      return { ok: false, error: "attachment.type must be image." };
    }
    if (a.source !== "user_reference") {
      return {
        ok: false,
        error: "Only user_reference images are supported in this phase.",
      };
    }
    const mimeType = parseMimeType(a.mimeType);
    if (!mimeType) {
      return { ok: false, error: "Unsupported image type. Use PNG, JPEG, or WebP." };
    }
    if (typeof a.dataBase64 !== "string" || a.dataBase64.length === 0) {
      return { ok: false, error: "attachment.dataBase64 is required." };
    }
    const raw = a.dataBase64.replace(/^data:[^;]+;base64,/, "").trim();
    if (estimateBase64DecodedBytes(raw) > BUILDER_MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: `Image exceeds ${Math.round(BUILDER_MAX_IMAGE_BYTES / (1024 * 1024))} MB limit.`,
      };
    }
    const name =
      typeof a.name === "string" && a.name.trim().length > 0
        ? a.name.trim().slice(0, MAX_NAME_CHARS)
        : "reference.png";
    attachment = {
      type: "image",
      source: "user_reference",
      mimeType,
      dataBase64: raw,
      name,
    };
  }

  const last = messages[messages.length - 1]!;
  if (last.role !== "user") {
    return { ok: false, error: "The last message must be from the user." };
  }

  let currentBlueprint: GenericBuildingBlueprintV2 | null = null;
  if (body.currentBlueprint != null) {
    const bp = parseCurrentBlueprintV2(body.currentBlueprint);
    if (!bp.ok) {
      return { ok: false, error: bp.error };
    }
    currentBlueprint = bp.blueprint;
  }

  let currentBlockCount: number | undefined;
  if (body.currentBlockCount != null) {
    if (
      typeof body.currentBlockCount !== "number" ||
      !Number.isFinite(body.currentBlockCount) ||
      body.currentBlockCount < 0
    ) {
      return { ok: false, error: "currentBlockCount must be a non-negative number when provided." };
    }
    currentBlockCount = Math.floor(body.currentBlockCount);
  }

  return {
    ok: true,
    data: {
      messages,
      attachment,
      currentBlueprint: currentBlueprint ?? null,
      ...(currentBlockCount != null ? { currentBlockCount } : {}),
    },
  };
}
