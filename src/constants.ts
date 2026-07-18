export const SCREENSHOT_MAX_BYTES = 350 * 1024;

export const CHANGE_KINDS = ["copy", "layout", "image", "data", "feature", "other"] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];

// scratch: deliberate type error for TASK-002 AC-006 verification, reverted before merge
const __scratchTypeError: number = "not a number";
