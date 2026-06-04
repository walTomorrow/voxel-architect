import { describe, expect, it } from "vitest";
import { formatBuilderConversationForExport } from "@/src/lib/builder/formatBuilderConversationExport";

describe("formatBuilderConversationForExport", () => {
  it("includes roles, content, and activity steps", () => {
    const text = formatBuilderConversationForExport(
      [
        {
          id: "1",
          role: "user",
          content: "make it taller",
          createdAtLabel: "Just now",
        },
        {
          id: "2",
          role: "assistant",
          content: "Raised the walls.",
          createdAtLabel: "Just now",
          activitySteps: [
            { id: "plan-det", label: "Matched deterministic edit", status: "success" },
          ],
        },
      ],
      { chatId: "chat-1", chatTitle: "Test build", presetId: "simple_cabin_v2" },
    );
    expect(text).toContain("# Voxel Architect");
    expect(text).toContain("[USER]");
    expect(text).toContain("make it taller");
    expect(text).toContain("[ASSISTANT]");
    expect(text).toContain("Matched deterministic edit");
    expect(text).toContain("simple_cabin_v2");
  });
});
