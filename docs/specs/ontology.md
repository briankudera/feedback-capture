# Project Ontology — Ubiquitous Language

**Created**: 2026-07-18
**Last Updated**: 2026-07-18

---

## Domain Glossary

| Term | Definition | Bounded Context |
|------|-----------|-------------------|
| Feedback request | A single captured point-and-click feedback item: element selector, requested change, optional screenshot, submitter, lifecycle status | Feedback Capture |
| Viewer | The authenticated caller of a route handler, as resolved by the host's `ResolveViewer` — not a package-defined identity, just whatever the host's auth system returns | Feedback Capture |
| Submitted by | The viewer's identity string persisted on a feedback request; sourced exclusively from `ResolveViewer`'s result, never from client-supplied payload data | Feedback Capture |
| Delivered | Terminal lifecycle flag on a feedback request meaning "the requested change has shipped." A delivered request cannot be deleted. | Feedback Capture |
| Change kind | A coarse classification of what a feedback request is asking for (e.g. copy, layout) — shared constant between client and schema (`CHANGE_KINDS`) | Feedback Capture |
| Source file hint | An optional, best-effort pointer from the captured element to the source file that likely renders it — not guaranteed accurate, a hint for triage only | Feedback Capture |
| Storage port | The `FeedbackRepository` interface — the only contract the route-handler factory uses to persist/read feedback requests | Feedback Capture |
| Auth port | The `ResolveViewer` function type — the only contract the route-handler factory uses to authorize a request | Feedback Capture |
| Proxy adapter | A `FeedbackRepository`/`ResolveViewer` implementation that forwards to an external backend over HTTP instead of a local Drizzle/Postgres connection — the pattern for hosts with no Node-side DB access | Feedback Capture |

## Bounded Contexts

| Context | Description | Key Terms |
|---------|-------------|-----------|
| Feedback Capture | The entire package: widget, schema, route-handler factory, storage/auth ports | Feedback request, Viewer, Submitted by, Delivered, Change kind, Storage port, Auth port |

## Conceptual Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                      Feedback Capture                        │
├─────────────────────────────────────────────────────────────┤
│  Host app (Open Host Service, implements both ports)          │
│       │                                                      │
│       ├──▶ Storage port (FeedbackRepository)                  │
│       │        implemented as: Drizzle adapter, or             │
│       │        Proxy adapter → external backend                │
│       │                                                      │
│       └──▶ Auth port (ResolveViewer)                          │
│                implemented as: host's own session/capability   │
│                check, or a proxy call to a backend auth        │
│                endpoint                                       │
└─────────────────────────────────────────────────────────────┘
```

## Ubiquitous Language Rules

1. **"Viewer" not "user"** — the package never assumes a concrete user model;
   "viewer" is the deliberately generic term for whatever identity a host's
   auth system resolves.
2. **"Delivered" is a one-way lifecycle transition** — do not conflate with
   "resolved," "closed," or "approved"; those don't exist in this package's
   model. A feedback request is either not-yet-delivered or delivered.
3. **"Feedback request" not "feedback item"/"submission"** — pick one term;
   the code, schema, and docs all say "feedback request" (`feedback_request`
   table, `FeedbackRequest*` types).

## Anti-Patterns to Avoid

| Anti-Pattern | Example | Correct |
|-------------|---------|---------|
| Calling the auth port "auth adapter" and the storage port "repository adapter" interchangeably with their host implementations | "the repository" meaning either the interface or a host's Drizzle implementation | Say "storage port" for the interface, "Drizzle adapter" / "proxy adapter" for a specific host implementation |
| Treating "source file hint" as authoritative | Auto-editing the hinted file without verification | Always treat it as a hint for human/agent triage, per README §5 of the original design doc |

## Enrichment Process

| Phase | How Ontology is Enriched |
|-------|----------------------------|
| `constitution create` | Initial terms from this file (2026-07-18) |
| `spec-to-tasks` (spec 001-ci-workflow) | No new domain terms expected — this spec is CI tooling, not a domain change |
