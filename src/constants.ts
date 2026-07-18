export const SCREENSHOT_MAX_BYTES = 350 * 1024;

export const CHANGE_KINDS = ["copy", "layout", "image", "data", "feature", "other"] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];
