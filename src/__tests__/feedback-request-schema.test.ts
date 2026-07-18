import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { feedbackRequest } from "../schema/feedback-request.js";

const DOCUMENTED_FIELDS = [
  "id",
  "status",
  "pageUrl",
  "elementSelector",
  "sourceFileHint",
  "elementText",
  "componentHint",
  "requestText",
  "changeKindGuess",
  "screenshotDataUrl",
  "viewport",
  "submittedBy",
  "submittedAt",
  "delivered",
  "deliveredAt",
];

describe("feedbackRequest table definition", () => {
  it("matches the 15 documented fields exactly — no missing or extra columns", () => {
    const columns = Object.keys(getTableColumns(feedbackRequest));
    expect(columns.sort()).toEqual([...DOCUMENTED_FIELDS].sort());
  });

  it("defaults status to 'new' and changeKindGuess to 'copy'", () => {
    const columns = getTableColumns(feedbackRequest);
    expect(columns.status.default).toBe("new");
    expect(columns.changeKindGuess.default).toBe("copy");
  });

  it("has no foreign-key reference on submittedBy (carried forward as-is)", () => {
    const { foreignKeys } = getTableConfig(feedbackRequest);
    expect(foreignKeys).toHaveLength(0);
  });

  it("carries the three production indexes", () => {
    const { indexes } = getTableConfig(feedbackRequest);
    const names = indexes.map((index) => index.config.name);
    expect(names.sort()).toEqual(
      [
        "idx_feedback_request_submitted_at",
        "idx_feedback_request_status_submitted_at",
        "idx_feedback_request_submitted_by",
      ].sort(),
    );
  });
});
