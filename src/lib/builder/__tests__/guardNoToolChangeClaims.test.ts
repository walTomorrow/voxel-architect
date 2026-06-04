import { describe, expect, it } from "vitest";
import { guardNoToolChangeClaims } from "@/src/lib/builder/guardNoToolChangeClaims";

describe("guardNoToolChangeClaims", () => {
  it("replaces preview update claims when no tool ran", () => {
    const result = guardNoToolChangeClaims({
      assistantText: "I updated the preview with a taller roof.",
      hasToolResult: false,
    });
    expect(result.changed).toBe(true);
    expect(result.text).toContain("did not update the preview");
    expect(result.text).not.toContain("I updated the preview");
  });

  it("replaces component add claims when no tool ran", () => {
    const result = guardNoToolChangeClaims({
      assistantText: "I added a chimney to the workshop.",
      hasToolResult: false,
      hasActiveBlueprint: true,
    });
    expect(result.changed).toBe(true);
    expect(result.text).toContain("did not update the preview");
  });

  it("replaces build-now claims when no tool ran", () => {
    const result = guardNoToolChangeClaims({
      assistantText: "The build now has thicker stone walls.",
      hasToolResult: false,
    });
    expect(result.changed).toBe(true);
  });

  it("allows suggestion phrasing", () => {
    const text = "I can suggest adding a chimney if you want more character.";
    const result = guardNoToolChangeClaims({
      assistantText: text,
      hasToolResult: false,
    });
    expect(result.changed).toBe(false);
    expect(result.text).toBe(text);
  });

  it("allows design opinion without change claims", () => {
    const text = "I think the design feels sturdy with the stone palette.";
    const result = guardNoToolChangeClaims({
      assistantText: text,
      hasToolResult: false,
    });
    expect(result.changed).toBe(false);
    expect(result.text).toBe(text);
  });

  it("does not guard tool-result turns", () => {
    const text = "The preview was updated with a sturdier stone shell.";
    const result = guardNoToolChangeClaims({
      assistantText: text,
      hasToolResult: true,
      toolResultOk: true,
    });
    expect(result.changed).toBe(false);
    expect(result.text).toBe(text);
  });
});
