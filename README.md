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
npm install github:briankudera/feedback-capture
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
