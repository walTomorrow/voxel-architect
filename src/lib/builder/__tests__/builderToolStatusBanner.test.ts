import { describe, expect, it } from "vitest";
import { buildToolResultStatusBanner } from "@/src/lib/builder/builderToolStatusBanner";
import type { BuilderToolResult } from "@/src/lib/builder/builderToolTypes";

function baseToolResult(overrides: Partial<BuilderToolResult>): BuilderToolResult {
  return {
    ok: true,
    toolKind: "refine",
    assistantSummary: "Updated wall materials",
    ...overrides,
  } as BuilderToolResult;
}

describe("buildToolResultStatusBanner", () => {
  it("shows preview updated for successful tool runs", () => {
    const banner = buildToolResultStatusBanner(
      baseToolResult({
        appliedOperations: ["Updated roof material"],
        blockCount: 448,
      }),
    );
    expect(banner.headline).toBe("Preview updated");
    expect(banner.detail).toContain("Updated roof material");
    expect(banner.detail).toContain("448");
    expect(banner.tone).toBe("success");
  });

  it("shows preview unchanged for failed tool runs", () => {
    const banner = buildToolResultStatusBanner(
      baseToolResult({
        ok: false,
        rejectionCode: "PLANNER_UNSUPPORTED",
        rejectionDetail: "Rejected unsupported edit: add porch",
      }),
    );
    expect(banner.headline).toBe("Preview unchanged");
    expect(banner.detail).toContain("Rejected unsupported edit");
    expect(banner.tone).toBe("failure");
  });
});
