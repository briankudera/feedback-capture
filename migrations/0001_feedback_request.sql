-- feedback-capture package migration 0001
-- Creates the feedback_request table and its three production indexes.
-- Apply this through your own host's migration runner.

CREATE TABLE IF NOT EXISTS "feedback_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"status" text NOT NULL DEFAULT 'new',
	"page_url" text NOT NULL,
	"element_selector" text NOT NULL,
	"source_file_hint" text,
	"element_text" text,
	"component_hint" text,
	"request_text" text NOT NULL,
	"change_kind_guess" text NOT NULL DEFAULT 'copy',
	"screenshot_data_url" text,
	"viewport" jsonb NOT NULL,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered" boolean NOT NULL DEFAULT false,
	"delivered_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_feedback_request_submitted_at" ON "feedback_request" ("submitted_at");
CREATE INDEX IF NOT EXISTS "idx_feedback_request_status_submitted_at" ON "feedback_request" ("status", "submitted_at");
CREATE INDEX IF NOT EXISTS "idx_feedback_request_submitted_by" ON "feedback_request" ("submitted_by");
