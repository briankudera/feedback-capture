# Project Architecture

**Created**: 2026-07-18
**Last Updated**: 2026-07-18

---

## 1. Logical Architecture

`feedback-capture` is a single-purpose npm package, not a running system — one
bounded context, distributed as a git-URL dependency into consumer Next.js apps.

### 1.1 Domains and Bounded Contexts

| Bounded Context | Description | Key Responsibilities | Dependencies |
|-----------------|-------------|----------------------|--------------|
| Feedback Capture | Point-and-click element feedback: capture, validate, persist, review-lifecycle | Client widget, payload schema, route-handler factory, storage/auth port interfaces | None — package has no external dependencies at the domain level |

### 1.2 Module Map

```
┌───────────────────────────────────────────────────────────┐
│                     feedback-capture                        │
├────────────┬────────────┬────────────────┬─────────────────┤
│  widget    │  schema    │ route-handlers │ storage/auth     │
│ (client)   │ (payload)  │  (factory)     │ ports (interfaces)│
│            │            │  → schema      │                  │
│            │            │  → storage port│                  │
│            │            │  → auth port   │                  │
└────────────┴────────────┴────────────────┴─────────────────┘
```

### 1.3 Shared Kernel

| Shared Concept | Used By | Description |
|---------------|---------|--------------|
| `FeedbackRecord` | widget, route-handlers, storage port | The `feedback_request` row shape at the JSON boundary |
| `ChangeKind` / `CHANGE_KINDS` | widget, schema | Shared enum-like constant, single source of truth for client + server |

### 1.4 Context Map

Single bounded context — no upstream/downstream relationships within the
package. The package itself is upstream of every consuming host app (GGB,
briankudera.com, and — per the pending `datalena-feedback-capture-integration`
handoff — datalena), each of which implements the storage and auth ports as
its own downstream adapters (Open Host Service pattern: the port interfaces
in `auth-types.ts`/`repository.ts` are the published language).

---

## 2. Infrastructure Architecture

**N/A — this package has no runtime infrastructure of its own.** It ships
source (no build/deploy step, no hosting, no database it owns) and is
consumed inside each host app's own infrastructure. The only infrastructure
concern for this repo itself is CI.

### 2.2 Infrastructure Components

| Component | Technology | Version | Purpose | Environment |
|-----------|-----------|---------|---------|-------------|
| CI/CD | GitHub Actions (GitHub-hosted runner) | N/A | typecheck + test gate on PRs to `main` | All |
| Distribution | git-URL dependency (`github:behindthedash/feedback-capture`) | N/A | No npm registry publish | All |

### 2.5 Environments

| Environment | Purpose | URL / Access | Infra Differences |
|-------------|---------|--------------|--------------------|
| CI | PR validation | GitHub Actions | GitHub-hosted `ubuntu-latest`; no self-hosted-runner concerns (unlike GGB/datalena) |

---

## 3. Software Architecture

### 3.1 Technology Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Language | TypeScript | ^5 | No compiled `dist/` — ships raw `.ts`/`.tsx` source |
| Peer: UI | React | ^19.0.0 | Consumer-provided |
| Peer: Framework | Next.js | ^16.0.0 | Consumer-provided; Web `Request`/`Response` route handlers |
| Peer: Validation | Zod | ^4.0.0 | Not dual v3/v4-compatible |
| Dependencies | `@medv/finder`, `modern-screenshot`, `lucide-react`, `drizzle-orm` | see `package.json` | `drizzle-orm` backs the default storage adapter only — not required for the proxy pattern (README "Non-Node storage backends") |
| Testing | Vitest, Testing Library, jsdom | ^4.1.x / ^16.x | Unit tests; one opt-in `TEST_DATABASE_URL`-gated migration integration test |

### 3.2 Data Architecture

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Primary Database | None owned by this package | — | Each host owns its own Postgres; package ships a reference Drizzle table + migration SQL (`src/schema/feedback-request.ts`, `migrations/0001_feedback_request.sql`) |
| ORM / Data Access | `drizzle-orm` (default path) or none (proxy path) | ^0.45 | `FeedbackRepository` interface decouples route handlers from any concrete client (REQ-026/032/033) |
| Migrations | Consumer's own migration runner | — | This package's migration SQL is a shape to replicate, not to run directly against a non-Drizzle host |

### 3.3 Architectural Style

**Style**: Ports & Adapters (Hexagonal), minimal — two ports only.

```
┌────────────────────────────────────────────────────────┐
│                 Host application (consumer)              │
│   implements: FeedbackRepository, ResolveViewer           │
├────────────────────────────────────────────────────────┤
│              feedback-capture package (this repo)        │
│  Widget → payload-schema → route-handler factory          │
│           factory depends only on the two port interfaces │
│           (never a concrete DB client or auth helper)     │
└────────────────────────────────────────────────────────┘
```

### 3.4 Project Structure

```
src/
├── feedback-capture.tsx       # Client widget (element picker, screenshot, form)
├── feedback-capture.module.css
├── constants.ts               # CHANGE_KINDS, SCREENSHOT_MAX_BYTES
├── payload-schema.ts          # Zod schema (feedbackPayloadSchema, viewportSchema)
├── auth-types.ts              # Auth port: ResolveViewer, ViewerResolution, CapabilityProbeResponse
├── repository.ts              # Storage port: FeedbackRepository, FeedbackRecord
├── route-handlers.ts          # Route-handler factory (create/list/setDelivered/delete)
├── validation-helpers.ts
├── schema/feedback-request.ts # Default Drizzle table definition
└── __tests__/                 # Colocated tests
```

### 3.5 Architectural Rules

- The route-handler factory (`route-handlers.ts`) MUST NOT import a concrete
  database client, ORM instance, or host-specific auth helper — it depends
  only on the injected `FeedbackRepository` and `ResolveViewer` ports
  (REQ-026, REQ-032, REQ-033).
- `insert()` takes `submittedBy` as a parameter, never read from the request
  payload — deriving it from client-controlled input is structurally
  impossible (REQ-025, REQ-NR002).
- `resolveViewer` throwing is treated identically to an unauthorized result;
  the repository is never invoked on a thrown/failed auth check.
- A `delivered` feedback record MUST NOT be deletable — enforced at the
  route-handler-factory level (REQ-023, REQ-NR004), not left to each
  repository implementation to re-check.
- No compiled `dist/` — package ships raw TS/TSX source (see README "Why no
  build step"). Consumers must add `transpilePackages`.

### 3.7 API Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| Runtime API | Web standard `Request`/`Response` | Mountable from any Next.js App Router route handler |
| Auth | Injected `ResolveViewer(request) => ViewerResolution` | Host-owned; package ships no concrete implementation |
| Error Format | `{ error: string }` JSON body | `{ "error": "Unauthorized" }`, 401 |

### 3.8 Library Verification

#### drizzle-orm

**Package**: `drizzle-orm`
**Version**: `^0.45.2`

**Approved APIs**: table/column builders used in `src/schema/feedback-request.ts`
only (`pgTable`, `uuid`, `text`, `jsonb`, `boolean`, `timestamp`).

**Usage Constraints**:
- Used only to define the *reference* table shape — never imported by
  `route-handlers.ts` or any file the factory depends on.

#### zod

**Package**: `zod`
**Version**: `^4.0.0`

**Usage Constraints**:
- v4 only — not dual-compatible with v3. Consumers migrating from v3 must
  upgrade first (see README peer dependencies note).

---

## 4. Security Constraints

### Forbidden Patterns (CRITICAL — Blocks Merge)

| Pattern | CWE-ID | OWASP | Reason | Detection |
|---------|--------|-------|--------|-----------|
| Route handler reading `submittedBy` from request body | CWE-284 | A01:2021 | Identity spoofing — `submittedBy` must come only from `resolveViewer`'s result | Grep `route-handlers.ts` for `submittedBy` sourced from `parsed.data` |
| Deleting a `delivered` feedback record without the guard | CWE-841 | A01:2021 | Improper state-transition enforcement — shipped-work records must be immutable | Check `remove()` in `route-handlers.ts` calls `findById` + checks `existing.delivered` before `repository.delete()` |

### Required Patterns (CRITICAL — Must Implement)

| Pattern | CWE-ID | OWASP | Why Required |
|---------|--------|-------|---------------|
| Every route handler calls `resolveViewer` before touching the repository | CWE-306 | A01:2021 | Missing authentication on sensitive endpoints |
| `resolveViewer` failures (throw or `authorized: false`) return 401 before repository access | CWE-863 | A01:2021 | Incorrect authorization |

### Recommended Patterns (SHOULD — Strongly Advised)

| Pattern | CWE-ID | Why Recommended |
|---------|--------|-------------------|
| Screenshot data URLs capped by `SCREENSHOT_MAX_BYTES` | CWE-400 | Resource exhaustion prevention (oversized payload) |
| Host review UIs sanitize/escape `requestText`/`elementText` before render | CWE-79 | XSS prevention — this package captures free text but does not render it in an admin UI itself |

---

## 5. AI Guardrails

- **Library Verification**: before adding any new dependency, check §3.8;
  this package intentionally has a minimal dependency footprint (exactly 4
  runtime dependencies) — a new one needs a clear reason.
- **Architectural Compliance**: never let `route-handlers.ts` or its imports
  reach for a concrete DB client or host-specific auth helper — that breaks
  the port/adapter boundary the whole package exists to provide.
- **Framework coupling is intentional**: do not "genericize" the widget away
  from React/Next.js — see README "not framework-agnostic." If a
  non-Next.js host is ever needed, that is a new package, not a refactor of
  this one.
- **Spec Death Principle**: archive completed specs to `archived/`.
- **No build step**: never add a `dist/`/build pipeline without revisiting
  the "Why no build step" README rationale first — it was a deliberate
  choice for a package with few consumers, not an oversight.
