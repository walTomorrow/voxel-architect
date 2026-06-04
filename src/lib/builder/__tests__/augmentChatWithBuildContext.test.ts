import { describe, expect, it } from "vitest";
import { clonePresetBlueprintV2 } from "@/src/lib/blueprints/clonePresetBlueprint";
import { buildBuilderSystemPromptWithContext } from "@/src/lib/builder/augmentChatWithBuildContext";
import { BUILDER_SYSTEM_PROMPT } from "@/src/lib/builder/builderSystemPrompt";

describe("buildBuilderSystemPromptWithContext", () => {
  it("returns base prompt without blueprint", () => {
    expect(buildBuilderSystemPromptWithContext(null)).toBe(BUILDER_SYSTEM_PROMPT);
  });

  it("includes current build summary when blueprint provided", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const prompt = buildBuilderSystemPromptWithContext(blueprint, {
      presetId: "simple_cabin_v2",
    });
    expect(prompt).toContain("[Current build context");
    expect(prompt).toContain("main-room");
  });

  it("labels block budget separately from generated blocks", () => {
    const blueprint = clonePresetBlueprintV2("simple_cabin_v2");
    const prompt = buildBuilderSystemPromptWithContext(blueprint, {
      presetId: "simple_cabin_v2",
      generatedBlockCount: 1234,
    });
    expect(prompt).toContain("block budget");
    expect(prompt).toContain("generated blocks: 1234");
  });
});
