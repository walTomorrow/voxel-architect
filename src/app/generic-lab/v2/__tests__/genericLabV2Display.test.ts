import { describe, expect, it } from "vitest";
import { buildSelectedComponentPreview } from "@/src/app/generic-lab/v2/genericLabV2Display";
import { cloneV2PresetBlueprint } from "@/src/app/generic-lab/v2/genericLabV2Utils";

describe("buildSelectedComponentPreview", () => {
  it("summarizes window groups for preview overlay", () => {
    const draft = cloneV2PresetBlueprint("porch_house_v2");
    const preview = buildSelectedComponentPreview(draft, "front-windows");
    expect(preview).not.toBeNull();
    expect(preview!.name).toBeTruthy();
    expect(preview!.id).toBe("front-windows");
    expect(preview!.attachment).toMatch(/Front face/);
    expect(preview!.details).toContain("window");
    expect(preview!.details).toContain("symmetric");
  });
});
