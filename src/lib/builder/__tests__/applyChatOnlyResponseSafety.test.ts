import { describe, expect, it } from "vitest";
import { applyChatOnlyResponseSafety } from "@/src/lib/builder/applyChatOnlyResponseSafety";

describe("applyChatOnlyResponseSafety", () => {
  it("parses discussion JSON then guards forbidden claims", () => {
    const raw = JSON.stringify({
      responseType: "discussion",
      message: "I added a chimney to make it sturdier.",
    });
    const result = applyChatOnlyResponseSafety({
      assistantText: raw,
      hasToolResult: false,
      hasActiveBlueprint: true,
    });
    expect(result.parsedDiscussionJson).toBe(true);
    expect(result.guarded).toBe(true);
    expect(result.text).toContain("did not update the preview");
  });

  it("passes through safe discussion JSON", () => {
    const raw = JSON.stringify({
      responseType: "discussion",
      message: "A useful next edit would be to increase roof height.",
    });
    const result = applyChatOnlyResponseSafety({
      assistantText: raw,
      hasToolResult: false,
    });
    expect(result.parsedDiscussionJson).toBe(true);
    expect(result.guarded).toBe(false);
    expect(result.text).toBe("A useful next edit would be to increase roof height.");
  });

  it("skips guard when tool result exists", () => {
    const result = applyChatOnlyResponseSafety({
      assistantText: "The preview was updated.",
      hasToolResult: true,
    });
    expect(result.guarded).toBe(false);
    expect(result.text).toBe("The preview was updated.");
  });
});
