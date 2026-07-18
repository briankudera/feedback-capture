import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { feedbackRequest } from "../schema/feedback-request";

// Opt-in: requires a scratch Postgres reachable at TEST_DATABASE_URL. Skipped
// otherwise so `npm test` never depends on a live database (REQ-031
// verification evidence; see README "Development" for how to run it).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("migration SQL (0001_feedback_request.sql)", () => {
  it("creates a feedback_request table matching the Drizzle schema's column set", async () => {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query('DROP TABLE IF EXISTS "feedback_request"');
      const testFileDir = dirname(fileURLToPath(import.meta.url));
      const migrationPath = resolve(testFileDir, "../../migrations/0001_feedback_request.sql");
      const sql = readFileSync(migrationPath, "utf8");
      await client.query(sql);

      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'feedback_request'`,
      );
      const dbColumns = rows.map((row: { column_name: string }) => row.column_name).sort();

      const expectedDbColumns = Object.values(getTableColumns(feedbackRequest))
        .map((column) => column.name)
        .sort();

      expect(dbColumns).toEqual(expectedDbColumns);

      const { rows: indexRows } = await client.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'feedback_request'`,
      );
      const indexNames = indexRows.map((row: { indexname: string }) => row.indexname);
      expect(indexNames).toEqual(
        expect.arrayContaining([
          "idx_feedback_request_submitted_at",
          "idx_feedback_request_status_submitted_at",
          "idx_feedback_request_submitted_by",
        ]),
      );
    } finally {
      await client.query('DROP TABLE IF EXISTS "feedback_request"');
      await client.end();
    }
  });
});
