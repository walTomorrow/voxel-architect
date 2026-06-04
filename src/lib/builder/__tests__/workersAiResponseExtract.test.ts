import { describe, expect, it } from "vitest";
import {
  classifyEmptyWorkersAiExtract,
  extractWorkersAiResponseText,
} from "@/src/lib/builder/workersAiResponseExtract";

describe("extractWorkersAiResponseText", () => {
  it("extracts string result (vision model sync shape)", () => {
    const { text, diagnostics } = extractWorkersAiResponseText(
      { success: true, result: '{"status":"ok","operations":[],"rationaleSummary":"x"}' },
      200,
      100,
    );
    expect(text).toContain("status");
    expect(diagnostics.extractPath).toBe("result");
  });

  it("extracts result.response string (chat REST shape)", () => {
    const { text, diagnostics } = extractWorkersAiResponseText(
      {
        success: true,
        result: { response: '{"status":"unsupported","unsupportedReason":"no"}' },
      },
      200,
      80,
    );
    expect(text).toContain("unsupported");
    expect(diagnostics.extractPath).toBe("result.response");
  });

  it("extracts JSON-mode object from result.response", () => {
    const { text, diagnostics } = extractWorkersAiResponseText(
      {
        success: true,
        result: {
          response: {
            status: "ok",
            operations: [{ op: "setMaterialPalette", patch: { roof: "oak_planks" } }],
            rationaleSummary: "Wood roof",
          },
        },
      },
      200,
      120,
    );
    expect(text).toContain("oak_planks");
    expect(diagnostics.extractPath).toBe("result.response");
  });

  it("extracts top-level response field", () => {
    const { text } = extractWorkersAiResponseText(
      { success: true, response: "hello planner" },
      200,
      40,
    );
    expect(text).toBe("hello planner");
  });

  it("returns null for empty response with diagnostics", () => {
    const { text, diagnostics } = extractWorkersAiResponseText(
      { success: true, result: { response: "" } },
      200,
      50,
    );
    expect(text).toBeNull();
    expect(diagnostics.hadText).toBe(false);
    expect(diagnostics.resultFieldNames).toContain("response");
  });

  it("classifies unexpected shape vs empty output", () => {
    const empty = extractWorkersAiResponseText({ success: true, result: {} }, 200, 30);
    expect(classifyEmptyWorkersAiExtract(empty.diagnostics)).toBe("UNEXPECTED_RESPONSE_SHAPE");

    const noResult = extractWorkersAiResponseText({ success: true }, 200, 20);
    expect(classifyEmptyWorkersAiExtract(noResult.diagnostics)).toBe("UNEXPECTED_RESPONSE_SHAPE");
  });
});
