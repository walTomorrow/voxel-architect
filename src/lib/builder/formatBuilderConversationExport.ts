import type { BuilderMessageView } from "@/src/app/builder/components/BuilderMessage";

export type BuilderConversationExportMeta = {
  readonly chatId: string;
  readonly chatTitle: string;
  readonly presetId?: string;
  readonly status?: string;
  readonly hasActiveBlueprint?: boolean;
  readonly lastOperationSummary?: string;
  readonly lastRejectionCode?: string;
  readonly lastRejectionDetail?: string;
};

function formatActivitySteps(
  steps: BuilderMessageView["activitySteps"],
): string {
  if (!steps || steps.length === 0) return "";
  const lines = steps.map(
    (s) => `  - [${s.status}] ${s.label}${s.id ? ` (${s.id})` : ""}`,
  );
  return `\nActivity:\n${lines.join("\n")}`;
}

function formatAttachments(message: BuilderMessageView): string {
  if (!message.attachments || message.attachments.length === 0) return "";
  const lines = message.attachments.map(
    (a) => `  - ${a.type} ${a.source}: ${a.name}`,
  );
  return `\nAttachments:\n${lines.join("\n")}`;
}

function formatMessage(message: BuilderMessageView): string {
  const role = message.role.toUpperCase();
  const flags = [
    message.isError ? "error" : null,
    message.isStreaming ? "streaming" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const flagSuffix = flags.length > 0 ? ` (${flags})` : "";
  const time = message.createdAtLabel ? ` · ${message.createdAtLabel}` : "";

  return [
    `[${role}]${flagSuffix}${time}`,
    message.content.trim() || "(empty)",
    formatAttachments(message),
    formatActivitySteps(message.activitySteps),
  ]
    .filter((block) => block.length > 0)
    .join("\n");
}

export function formatBuilderConversationForExport(
  messages: readonly BuilderMessageView[],
  meta: BuilderConversationExportMeta,
): string {
  const exportedAt = new Date().toISOString();
  const header = [
    "# Voxel Architect — Builder chat export",
    `Exported: ${exportedAt}`,
    `Chat: ${meta.chatTitle} (${meta.chatId})`,
    meta.presetId ? `Preset: ${meta.presetId}` : null,
    meta.status ? `Status: ${meta.status}` : null,
    meta.hasActiveBlueprint != null
      ? `Active blueprint in memory: ${meta.hasActiveBlueprint ? "yes" : "no"}`
      : null,
    meta.lastOperationSummary
      ? `Last operation summary: ${meta.lastOperationSummary}`
      : null,
    meta.lastRejectionCode ? `Last rejection code: ${meta.lastRejectionCode}` : null,
    meta.lastRejectionDetail ? `Last rejection detail: ${meta.lastRejectionDetail}` : null,
    `Message count: ${messages.length}`,
    "",
  ].filter((line): line is string => line != null);

  const body =
    messages.length === 0
      ? "(No messages in this conversation.)"
      : messages.map((m) => formatMessage(m)).join("\n\n");

  return [...header, body].join("\n");
}
