import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolveViewer } from "../auth-types";
import type { FeedbackRecord, FeedbackRepository } from "../repository";
import { createFeedbackHandlers } from "../route-handlers";

const validPayload = {
  pageUrl: "/get/donate",
  elementSelector: "main h1",
  requestText: "Change the headline.",
  viewport: { width: 1440, height: 900 },
};

function makeRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    status: "new",
    pageUrl: "/get/donate",
    elementSelector: "main h1",
    sourceFileHint: null,
    elementText: null,
    componentHint: null,
    requestText: "Change the headline.",
    changeKindGuess: "copy",
    screenshotDataUrl: null,
    viewport: { width: 1440, height: 900 },
    submittedBy: "user-1",
    submittedAt: new Date(0).toISOString(),
    delivered: false,
    deliveredAt: null,
    ...overrides,
  };
}

function makeRepository(overrides: Partial<FeedbackRepository> = {}): FeedbackRepository {
  return {
    insert: vi.fn(async (_payload, submittedBy) => makeRecord({ submittedBy })),
    list: vi.fn(async () => [makeRecord()]),
    findById: vi.fn(async () => makeRecord()),
    setDelivered: vi.fn(async (_id, delivered) =>
      makeRecord({ delivered, deliveredAt: delivered ? new Date(0).toISOString() : null }),
    ),
    delete: vi.fn(async () => true),
    ...overrides,
  };
}

function postRequest(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/feedback", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
}

const authorized: ResolveViewer = async () => ({ authorized: true, submittedBy: "user-1" });
const unauthorized: ResolveViewer = async () => ({ authorized: false });

describe("createFeedbackHandlers", () => {
  describe("create", () => {
    it("calls repository.insert with submittedBy from the authorization result, not the body", async () => {
      const repository = makeRepository();
      const { create } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await create(postRequest({ ...validPayload, submittedBy: "attacker" }));

      expect(response.status).toBe(201);
      expect(repository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ pageUrl: validPayload.pageUrl }),
        "user-1",
      );
      const insertedPayload = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedPayload.submittedBy).toBeUndefined();
    });

    it("never calls repository.insert for an unauthorized request", async () => {
      const repository = makeRepository();
      const { create } = createFeedbackHandlers({ resolveViewer: unauthorized, repository });

      const response = await create(postRequest(validPayload));

      expect(response.status).toBe(401);
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it("rejects a schema-invalid request before calling repository.insert", async () => {
      const repository = makeRepository();
      const { create } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await create(postRequest({ ...validPayload, pageUrl: "" }));

      expect(response.status).toBe(400);
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON with a 400", async () => {
      const repository = makeRepository();
      const { create } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const request = new Request("http://localhost/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      });
      const response = await create(request);

      expect(response.status).toBe(400);
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it("treats resolveViewer throwing the same as unauthorized", async () => {
      const repository = makeRepository();
      const throwing: ResolveViewer = async () => {
        throw new Error("boom");
      };
      const { create } = createFeedbackHandlers({ resolveViewer: throwing, repository });

      const response = await create(postRequest(validPayload));

      expect(response.status).toBe(401);
      expect(repository.insert).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("never calls repository.list for an unauthorized request", async () => {
      const repository = makeRepository();
      const { list } = createFeedbackHandlers({ resolveViewer: unauthorized, repository });

      const response = await list(new Request("http://localhost/feedback"));

      expect(response.status).toBe(401);
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("lists with the default limit when authorized", async () => {
      const repository = makeRepository();
      const { list } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await list(new Request("http://localhost/feedback"));

      expect(response.status).toBe(200);
      expect(repository.list).toHaveBeenCalledWith(50);
      const body = await response.json();
      expect(body.requests).toHaveLength(1);
    });

    it("rejects an out-of-range limit", async () => {
      const repository = makeRepository();
      const { list } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await list(new Request("http://localhost/feedback?limit=0"));

      expect(response.status).toBe(400);
      expect(repository.list).not.toHaveBeenCalled();
    });
  });

  describe("setDelivered", () => {
    it("toggling to true records a delivered timestamp via the repository", async () => {
      const repository = makeRepository();
      const { setDelivered } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await setDelivered(
        postRequest({ delivered: true }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(200);
      expect(repository.setDelivered).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        true,
      );
      const body = await response.json();
      expect(body.feedback.deliveredAt).not.toBeNull();
    });

    it("toggling to false clears the delivered timestamp via the repository", async () => {
      const repository = makeRepository();
      const { setDelivered } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await setDelivered(
        postRequest({ delivered: false }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.feedback.deliveredAt).toBeNull();
    });

    it("rejects an unauthorized request without calling repository.setDelivered", async () => {
      const repository = makeRepository();
      const { setDelivered } = createFeedbackHandlers({ resolveViewer: unauthorized, repository });

      const response = await setDelivered(postRequest({ delivered: true }), "not-checked");

      expect(response.status).toBe(401);
      expect(repository.setDelivered).not.toHaveBeenCalled();
    });

    it("rejects a malformed id", async () => {
      const repository = makeRepository();
      const { setDelivered } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await setDelivered(postRequest({ delivered: true }), "not-a-uuid");

      expect(response.status).toBe(400);
      expect(repository.setDelivered).not.toHaveBeenCalled();
    });

    it("rejects a non-boolean delivered field", async () => {
      const repository = makeRepository();
      const { setDelivered } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await setDelivered(
        postRequest({ delivered: "yes" }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(400);
      expect(repository.setDelivered).not.toHaveBeenCalled();
    });

    it("returns 404 when the target record does not exist", async () => {
      const repository = makeRepository({ setDelivered: vi.fn(async () => null) });
      const { setDelivered } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await setDelivered(
        postRequest({ delivered: true }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(404);
    });
  });

  describe("delete", () => {
    it("rejects deleting a delivered record and never calls repository.delete", async () => {
      const repository = makeRepository({
        findById: vi.fn(async () => makeRecord({ delivered: true })),
      });
      const { delete: remove } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await remove(
        new Request("http://localhost/feedback/1", { method: "DELETE" }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(409);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("deletes an outstanding (non-delivered) record", async () => {
      const repository = makeRepository({
        findById: vi.fn(async () => makeRecord({ delivered: false })),
      });
      const { delete: remove } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await remove(
        new Request("http://localhost/feedback/1", { method: "DELETE" }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(200);
      expect(repository.delete).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    });

    it("rejects an unauthorized request without calling repository.findById or delete", async () => {
      const repository = makeRepository();
      const { delete: remove } = createFeedbackHandlers({ resolveViewer: unauthorized, repository });

      const response = await remove(
        new Request("http://localhost/feedback/1", { method: "DELETE" }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(401);
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("rejects a malformed id", async () => {
      const repository = makeRepository();
      const { delete: remove } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await remove(
        new Request("http://localhost/feedback/1", { method: "DELETE" }),
        "not-a-uuid",
      );

      expect(response.status).toBe(400);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the target record does not exist", async () => {
      const repository = makeRepository({ findById: vi.fn(async () => null) });
      const { delete: remove } = createFeedbackHandlers({ resolveViewer: authorized, repository });

      const response = await remove(
        new Request("http://localhost/feedback/1", { method: "DELETE" }),
        "11111111-1111-1111-1111-111111111111",
      );

      expect(response.status).toBe(404);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
