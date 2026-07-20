# feedback-capture

A point-and-click feedback capture widget and write path for Next.js sites.
An authenticated visitor clicks an element on a live page, attaches a note,
and the request lands in a host-owned review surface.

**This package is coupled to React and Next.js — it is not framework-agnostic.**
It ships:

- a client capture widget (element picker, optional screenshot, submission form)
- a shared Zod validation schema and constants (`CHANGE_KINDS`, `SCREENSHOT_MAX_BYTES`)
- a route-handler factory for create / list / mark-delivered / delete
- a Drizzle table definition and migration SQL for `feedback_request`
- a repository interface (`insert`, `list`, `setDelivered`, `delete`)
- auth adapter contract types (`ResolveViewer`, `CapabilityProbeResponse`)

It does **not** ship an admin inbox/review UI or a concrete auth implementation —
each consuming host builds those against the contracts above.

## Install

This package is distributed as a git-URL dependency (no npm registry publish
yet):

```bash
npm install github:behindthedash/feedback-capture
```

No authentication token is required — the repository is public.

### Required host configuration

Because this package ships raw TypeScript/TSX source (no build step — see
"Why no build step" below), your Next.js app must transpile it:

```js
// next.config.js
const nextConfig = {
  transpilePackages: ["feedback-capture"],
};
```

## Peer dependencies

- `react` `^19.0.0`
- `next` `^16.0.0`
- `zod` `^4.0.0` (not a dual v3/v4 range — see the spec's Decision 5 if migrating from Zod v3)

## Usage

### 1. Copy the schema and apply the migration

Copy `migrations/0001_feedback_request.sql`'s table shape into your own Drizzle
schema (see `src/schema/feedback-request.ts` for the Drizzle table definition)
and apply the migration through your own migration runner.

**Host has no Drizzle/Node-side DB access?** See "Non-Node storage backends
(proxy pattern)" below instead of step 1 — you'll implement `FeedbackRepository`
against your existing backend's API rather than against this table directly.

### 2. Implement the auth adapter

```ts
import type { ResolveViewer, CapabilityProbeResponse } from "feedback-capture";

// Wrap your own auth system here. `submittedBy` must be present whenever
// `authorized` is true — it's the only identity a create handler may persist.
const resolveViewer: ResolveViewer = async (request) => {
  const session = await getSessionSomehow(request);
  if (!session) return { authorized: false };
  return { authorized: true, submittedBy: session.userId };
};
```

### 3. Wire the route-handler factory

```ts
import { createFeedbackHandlers } from "feedback-capture";
import { resolveViewer } from "@/lib/feedback-auth-adapter";
import { feedbackRepository } from "@/lib/feedback-repository";

// createFeedbackHandlers() returns { create, list, setDelivered, delete } —
// note the key is literally `delete`, not `remove`.
export const { create, list, setDelivered, delete: remove } = createFeedbackHandlers({
  resolveViewer,
  repository: feedbackRepository,
});
```

### 4. Mount the widget

```tsx
import { FeedbackCapture } from "feedback-capture";

<FeedbackCapture
  submissionEndpoint="/api/admin/feedback"
  capabilityProbeEndpoint="/api/admin/me"
/>;
```

## Non-Node storage backends (proxy pattern)

`FeedbackRepository` is a plain interface — the route-handler factory never
imports Drizzle or any concrete client (see `src/repository.ts`). The
Drizzle table + migration is the *default* storage, not a requirement. If
your Next.js app has no Node-side DB access — e.g. it's a pure frontend that
proxies everything to a separate backend (FastAPI, Rails, a different Node
service) — implement `FeedbackRepository` as a thin HTTP client against that
backend instead of standing up a second, parallel database connection just
for this feature:

```ts
import type { FeedbackRepository } from "feedback-capture";

const API_BASE = process.env.BACKEND_API_URL!;

export const feedbackRepository: FeedbackRepository = {
  async insert(payload, submittedBy) {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, submittedBy }),
    });
    if (!res.ok) throw new Error(`backend insert failed: ${res.status}`);
    return res.json();
  },
  async list(limit) {
    const res = await fetch(`${API_BASE}/feedback?limit=${limit}`);
    if (!res.ok) throw new Error(`backend list failed: ${res.status}`);
    const { requests } = await res.json();
    return requests;
  },
  async findById(id) {
    const res = await fetch(`${API_BASE}/feedback/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`backend findById failed: ${res.status}`);
    return res.json();
  },
  async setDelivered(id, delivered) {
    const res = await fetch(`${API_BASE}/feedback/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delivered }),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`backend setDelivered failed: ${res.status}`);
    return res.json();
  },
  async delete(id) {
    const res = await fetch(`${API_BASE}/feedback/${id}`, { method: "DELETE" });
    return res.ok;
  },
};
```

The backend owns the actual table (any shape it wants, as long as the JSON
response matches `FeedbackRecord`) and the migration; the `feedback_request`
Drizzle schema and `migrations/0001_feedback_request.sql` in this package
become a reference shape to replicate in the backend's own migration tool
(e.g. Alembic), not something you run directly. `resolveViewer` can follow
the same shape — call your backend's session-check endpoint instead of
checking a local session store:

```ts
import type { ResolveViewer } from "feedback-capture";

export const resolveViewer: ResolveViewer = async (request) => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  if (!res.ok) return null;
  const { userId, isAdmin } = await res.json();
  return isAdmin ? { authorized: true, submittedBy: userId } : { authorized: false };
};
```

Everything from step 2 onward (auth adapter, route-handler wiring, widget
mount) is unchanged — the proxy only affects how `FeedbackRepository` is
implemented, not how it's consumed.

## Why no build step

This package ships its TypeScript/TSX source directly rather than a compiled
`dist/`. It is explicitly React/Next.js-coupled (not framework-agnostic, see
peer dependencies above), so every consumer already runs a Next.js build that
can compile it — the same way Next.js compiles the consumer's own `src/`. This
avoids a duplicate-toolchain build step, CSS Modules compilation concerns, and
ESM/CJS dual-package hazards for a package with exactly two known consumers.
Consumers must add the package name to `transpilePackages` in `next.config.js`
(Next.js does not transpile `node_modules` by default).

## Development

```bash
npm install
npm run typecheck
npm test
```
