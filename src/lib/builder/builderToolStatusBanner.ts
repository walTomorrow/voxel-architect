import type { BuilderToolResult } from "@/src/lib/builder/builderToolTypes";

export type BuilderToolStatusBanner = {
  readonly headline: string;
  readonly detail?: string;
  readonly tone: "success" | "failure" | "neutral";
};

export function buildToolResultStatusBanner(
  toolResult: BuilderToolResult,
): BuilderToolStatusBanner {
  if (!toolResult.ok) {
    const detail =
      toolResult.rejectionDetail?.trim() ||
      toolResult.error?.trim() ||
      "The builder tool did not apply a change.";
    return {
      headline: "Preview unchanged",
      detail,
      tone: "failure",
    };
  }

  const applied =
    toolResult.appliedOperations && toolResult.appliedOperations.length > 0
      ? toolResult.appliedOperations.join("; ")
      : toolResult.assistantSummary;

  const blockNote =
    toolResult.blockCount != null
      ? `Generated ${toolResult.blockCount.toLocaleString()} blocks`
      : undefined;

  const parts = [applied, blockNote].filter(Boolean);

  return {
    headline: "Preview updated",
    detail: parts.length > 0 ? parts.join(" · ") : undefined,
    tone: "success",
  };
}

export function formatToolStatusBannerText(banner: BuilderToolStatusBanner): string {
  return banner.detail ? `${banner.headline} · ${banner.detail}` : banner.headline;
}
