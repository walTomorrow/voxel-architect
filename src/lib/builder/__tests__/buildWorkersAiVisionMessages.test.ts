import { describe, expect, it } from "vitest";
import { buildVisionRequestBody } from "@/src/lib/builder/callWorkersAiChat";
import { buildWorkersAiVisionMessages } from "@/src/lib/builder/buildWorkersAiVisionMessages";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("buildWorkersAiVisionMessages", () => {
  it("keeps message content as plain text (image sent separately)", () => {
    const messages = buildWorkersAiVisionMessages(
      [{ role: "user", content: "Describe this tower" }],
      [
        {
          type: "image",
          source: "user_reference",
          mimeType: "image/png",
          dataBase64: TINY_PNG_BASE64,
          name: "tower.png",
        },
      ],
    );
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toBe("Describe this tower");
    expect(typeof user?.content).toBe("string");
  });
});

describe("buildVisionRequestBody", () => {
  it("uses native Workers AI shape with top-level image field", () => {
    const body = buildVisionRequestBody(
      [{ role: "user", content: "Recreate this tower" }],
      [
        {
          type: "image",
          source: "user_reference",
          mimeType: "image/png",
          dataBase64: TINY_PNG_BASE64,
          name: "tower.png",
        },
      ],
    );
    expect(body).toHaveProperty("messages");
    expect(body).toHaveProperty("image");
    expect(body.image).toBe(`data:image/png;base64,${TINY_PNG_BASE64}`);
    expect(body).not.toHaveProperty("model");
  });
});
