import type { z } from "zod";
import type { ResolveViewer } from "./auth-types";
import { feedbackPayloadSchema } from "./payload-schema";
import type { FeedbackRepository } from "./repository";
import { requireJsonContentType, UUID_RE } from "./validation-helpers";

export type FeedbackHandlerDeps = {
  resolveViewer: ResolveViewer;
  repository: FeedbackRepository;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function validationMessage(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid feedback payload";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}

/**
 * `resolveViewer` throwing is treated the same as an unauthorized result
 * (REQ-022 edge case) — the request is rejected before the repository is
 * ever invoked.
 */
async function safeResolveViewer(resolveViewer: ResolveViewer, request: Request) {
  try {
    return await resolveViewer(request);
  } catch {
    return null;
  }
}

/**
 * Route-handler factory: accepts an injected authorization check and
 * repository implementation, returns handlers for create/list/mark-delivered
 * /delete. Imports no host-specific auth helper or database client (REQ-026)
 * and works against the standard `Request`/`Response` Web API so it stays
 * mountable from any Next.js App Router route handler (or any other router
 * built on the same primitives) without the package assuming a specific one.
 */
export function createFeedbackHandlers({ resolveViewer, repository }: FeedbackHandlerDeps) {
  async function create(request: Request): Promise<Response> {
    const contentTypeError = requireJsonContentType(request);
    if (contentTypeError) return json({ error: contentTypeError }, 400);

    const viewer = await safeResolveViewer(resolveViewer, request);
    if (!viewer?.authorized || !viewer.submittedBy) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = feedbackPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: validationMessage(parsed.error) }, 400);
    }

    const record = await repository.insert(parsed.data, viewer.submittedBy);
    return json({ id: record.id, status: record.status }, 201);
  }

  async function list(request: Request): Promise<Response> {
    const viewer = await safeResolveViewer(resolveViewer, request);
    if (!viewer?.authorized) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit") ?? "50";
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return json({ error: "limit must be an integer between 1 and 100" }, 400);
    }

    const requests = await repository.list(limit);
    return json({ requests }, 200);
  }

  async function setDelivered(request: Request, id: string): Promise<Response> {
    const viewer = await safeResolveViewer(resolveViewer, request);
    if (!viewer?.authorized) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (!UUID_RE.test(id)) {
      return json({ error: "Invalid feedback id" }, 400);
    }

    const contentTypeError = requireJsonContentType(request);
    if (contentTypeError) return json({ error: contentTypeError }, 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (typeof (body as { delivered?: unknown })?.delivered !== "boolean") {
      return json({ error: "delivered must be a boolean" }, 400);
    }

    const updated = await repository.setDelivered(id, (body as { delivered: boolean }).delivered);
    if (!updated) {
      return json({ error: "Feedback request not found" }, 404);
    }
    return json({ feedback: updated }, 200);
  }

  async function remove(request: Request, id: string): Promise<Response> {
    const viewer = await safeResolveViewer(resolveViewer, request);
    if (!viewer?.authorized) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (!UUID_RE.test(id)) {
      return json({ error: "Invalid feedback id" }, 400);
    }

    const existing = await repository.findById(id);
    if (!existing) {
      return json({ error: "Feedback request not found" }, 404);
    }

    // A delivered request is a shipped-work record — it must not be
    // deletable (REQ-023, REQ-NR004). Rejected before repository.delete()
    // is ever invoked.
    if (existing.delivered) {
      return json({ error: "Delivered feedback cannot be deleted." }, 409);
    }

    await repository.delete(id);
    return json({ ok: true }, 200);
  }

  return { create, list, setDelivered, delete: remove };
}
