import { z } from "zod";
import { CHANGE_KINDS, SCREENSHOT_MAX_BYTES } from "./constants.js";

export const viewportSchema = z.object({
  width: z.number().finite().positive().max(10000),
  height: z.number().finite().positive().max(10000),
  devicePixelRatio: z.number().finite().positive().max(10).optional(),
});

export const feedbackPayloadSchema = z.object({
  pageUrl: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), {
      message: "pageUrl must be a path or URL",
    }),
  elementSelector: z.string().trim().min(1).max(2048),
  sourceFileHint: z.string().trim().max(512).nullable().optional(),
  elementText: z.string().trim().max(4000).nullable().optional(),
  componentHint: z.string().trim().max(256).nullable().optional(),
  requestText: z.string().trim().min(1).max(4000),
  changeKindGuess: z.enum(CHANGE_KINDS).default("copy"),
  screenshotDataUrl: z
    .string()
    .max(SCREENSHOT_MAX_BYTES)
    .refine((value) => value.startsWith("data:image/"), {
      message: "screenshotDataUrl must be an image data URL",
    })
    .nullable()
    .optional(),
  viewport: viewportSchema,
});

export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;
