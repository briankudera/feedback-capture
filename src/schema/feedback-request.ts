import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * `feedback_request` table definition. Carried forward verbatim from the
 * originating host's production schema (REQ-030) — including two
 * intentionally-unusual quirks that are NOT bugs to fix here:
 *   - `status` stays vestigial (default 'new', never redesigned — REQ-NR005).
 *   - `submittedBy` carries no `.references()` foreign key (REQ-030,
 *     data-model.md §1) — out of scope for this package to change.
 */
export const feedbackRequest = pgTable(
  "feedback_request",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    status: text("status").notNull().default("new"),
    pageUrl: text("page_url").notNull(),
    elementSelector: text("element_selector").notNull(),
    sourceFileHint: text("source_file_hint"),
    elementText: text("element_text"),
    componentHint: text("component_hint"),
    requestText: text("request_text").notNull(),
    changeKindGuess: text("change_kind_guess").notNull().default("copy"),
    screenshotDataUrl: text("screenshot_data_url"),
    viewport: jsonb("viewport").$type<Record<string, unknown>>().notNull(),
    submittedBy: uuid("submitted_by").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    delivered: boolean("delivered").notNull().default(false),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => ({
    submittedAtIdx: index("idx_feedback_request_submitted_at").on(table.submittedAt),
    statusSubmittedAtIdx: index("idx_feedback_request_status_submitted_at").on(
      table.status,
      table.submittedAt,
    ),
    submittedByIdx: index("idx_feedback_request_submitted_by").on(table.submittedBy),
  }),
);
