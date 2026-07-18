import { describe, expect, it } from "vitest";
import type { FeedbackRecord, FeedbackRepository } from "../repository.js";

function makeInMemoryRepository(): FeedbackRepository {
  const rows = new Map<string, FeedbackRecord>();
  let counter = 0;

  return {
    async insert(payload, submittedBy) {
      const id = `row-${++counter}`;
      const record: FeedbackRecord = {
        id,
        status: "new",
        pageUrl: payload.pageUrl,
        elementSelector: payload.elementSelector,
        sourceFileHint: payload.sourceFileHint ?? null,
        elementText: payload.elementText ?? null,
        componentHint: payload.componentHint ?? null,
        requestText: payload.requestText,
        changeKindGuess: payload.changeKindGuess,
        screenshotDataUrl: payload.screenshotDataUrl ?? null,
        viewport: payload.viewport,
        submittedBy,
        submittedAt: new Date(0).toISOString(),
        delivered: false,
        deliveredAt: null,
      };
      rows.set(id, record);
      return record;
    },
    async list(limit) {
      return Array.from(rows.values()).slice(0, limit);
    },
    async setDelivered(id, delivered) {
      const existing = rows.get(id);
      if (!existing) return null;
      const updated: FeedbackRecord = {
        ...existing,
        delivered,
        deliveredAt: delivered ? new Date(0).toISOString() : null,
      };
      rows.set(id, updated);
      return updated;
    },
    async delete(id) {
      return rows.delete(id);
    },
  };
}

describe("FeedbackRepository (in-memory conformance)", () => {
  it("satisfies insert/list/setDelivered/delete end to end", async () => {
    const repository = makeInMemoryRepository();

    const created = await repository.insert(
      {
        pageUrl: "/get/donate",
        elementSelector: "main h1",
        requestText: "Change the headline.",
        changeKindGuess: "copy",
        viewport: { width: 1440, height: 900 },
      },
      "user-1",
    );
    expect(created.submittedBy).toBe("user-1");
    expect(created.delivered).toBe(false);

    const listed = await repository.list(10);
    expect(listed).toHaveLength(1);

    const delivered = await repository.setDelivered(created.id, true);
    expect(delivered?.delivered).toBe(true);
    expect(delivered?.deliveredAt).not.toBeNull();

    const restored = await repository.setDelivered(created.id, false);
    expect(restored?.delivered).toBe(false);
    expect(restored?.deliveredAt).toBeNull();

    const deleted = await repository.delete(created.id);
    expect(deleted).toBe(true);
    expect(await repository.list(10)).toHaveLength(0);
  });

  it("returns null from setDelivered for an unknown id", async () => {
    const repository = makeInMemoryRepository();
    expect(await repository.setDelivered("missing", true)).toBeNull();
  });
});
