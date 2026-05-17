import { describe, expect, test } from "vitest";

import { paneAxisForWindowCell } from "@/src/lib/generation/facade/paneAxis";

describe("paneAxisForWindowCell", () => {
  test("front/back façades (constant lz) use axis x", () => {
    const W = 9;
    const D = 9;
    expect(paneAxisForWindowCell(4, D - 1, W, D)).toBe("x");
    expect(paneAxisForWindowCell(4, 0, W, D)).toBe("x");
  });

  test("left/right façades (constant lx) use axis z", () => {
    const W = 9;
    const D = 9;
    expect(paneAxisForWindowCell(0, 4, W, D)).toBe("z");
    expect(paneAxisForWindowCell(W - 1, 4, W, D)).toBe("z");
  });

  test("returns undefined for corners (ambiguous façade)", () => {
    const W = 9;
    const D = 9;
    expect(paneAxisForWindowCell(0, 0, W, D)).toBeUndefined();
    expect(paneAxisForWindowCell(W - 1, D - 1, W, D)).toBeUndefined();
  });
});
