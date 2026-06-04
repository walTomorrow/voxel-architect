import { describe, expect, it } from "vitest";
import { resolvePresetFromPrompt } from "@/src/lib/builder/resolvePresetFromPrompt";

describe("resolvePresetFromPrompt", () => {
  it("maps workshop intent to stone_workshop_v2", () => {
    expect(resolvePresetFromPrompt("build a stone workshop")).toBe(
      "stone_workshop_v2",
    );
  });

  it("maps porch intent to porch_house_v2", () => {
    expect(resolvePresetFromPrompt("make a house with a porch")).toBe(
      "porch_house_v2",
    );
  });

  it("maps cottage intent to simple_cabin_v2", () => {
    expect(resolvePresetFromPrompt("make me a small stone cottage")).toBe(
      "simple_cabin_v2",
    );
  });

  it("defaults to simple_cabin_v2", () => {
    expect(resolvePresetFromPrompt("generate something")).toBe("simple_cabin_v2");
  });
});
