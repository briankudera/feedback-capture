import { describe, expect, it } from "vitest";
import { SCREENSHOT_MAX_BYTES } from "../constants";
import { feedbackPayloadSchema } from "../payload-schema";

const validPayload = {
  pageUrl: "/get/donate",
  elementSelector: "main h1",
  requestText: "Change the headline.",
  viewport: { width: 1440, height: 900, devicePixelRatio: 1 },
};

describe("feedbackPayloadSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = feedbackPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it.each(["pageUrl", "elementSelector", "requestText", "viewport"])(
    "rejects a payload missing %s",
    (field) => {
      const { [field]: _omit, ...rest } = validPayload as Record<string, unknown>;
      const result = feedbackPayloadSchema.safeParse(rest);
      expect(result.success).toBe(false);
    },
  );

  it("accepts null/absent optional fields", () => {
    const result = feedbackPayloadSchema.safeParse({
      ...validPayload,
      sourceFileHint: null,
      elementText: null,
      componentHint: null,
      screenshotDataUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a screenshot data URL exceeding SCREENSHOT_MAX_BYTES", () => {
    const oversized = `data:image/png;base64,${"a".repeat(SCREENSHOT_MAX_BYTES)}`;
    const result = feedbackPayloadSchema.safeParse({
      ...validPayload,
      screenshotDataUrl: oversized,
    });
    expect(result.success).toBe(false);
  });

  it("defaults changeKindGuess to copy when omitted", () => {
    const result = feedbackPayloadSchema.parse(validPayload);
    expect(result.changeKindGuess).toBe("copy");
  });

  it("rejects a changeKindGuess outside CHANGE_KINDS", () => {
    const result = feedbackPayloadSchema.safeParse({
      ...validPayload,
      changeKindGuess: "not-a-real-kind",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a pageUrl that is neither a path nor an absolute URL", () => {
    const result = feedbackPayloadSchema.safeParse({ ...validPayload, pageUrl: "ftp://x" });
    expect(result.success).toBe(false);
  });

  it("rejects requestText exceeding the maximum length", () => {
    const result = feedbackPayloadSchema.safeParse({
      ...validPayload,
      requestText: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });
});
