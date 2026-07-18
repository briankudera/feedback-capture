# Decision Log: CI Workflow (typecheck + test gate)

| ID | Date | Task | Decision | Alternatives | Impact | Decided By |
|----|------|------|----------|--------------|--------|------------|
| DEC-001 | 2026-07-18 | Brainstorming | Approach B (Balanced): PR-triggered typecheck + test gate, no coverage gate, no docs-path filtering, no main-push job | A (typecheck only), C (Comprehensive: +Postgres service, +coverage gate, +main-push job, +path filtering) | Sets spec scope to the minimum reliable gate proportionate to repo size/risk today | autonomous brainstorm session (auto-mode, no blocking scope decision identified) |
| DEC-002 | 2026-07-18 | Brainstorming | Coverage-gate stretch item explicitly deferred (Non-Goal), not just left as an open stretch option | Input brief's suggestion: main-push job running `test:coverage` as a non-blocking stretch | Overrides a factual claim in the input brief — see below | autonomous brainstorm session, based on verified evidence |

## DEC-001: Approach Selection

- **Date**: 2026-07-18
- **Task**: Brainstorming
- **Phase**: Approach Selection
- **Context**: Selecting the functional scope for the first CI gate on a brand-new,
  zero-CI, single-package repo with 2 known downstream consumers so far.
- **Decision**: Approach B — a single `pull_request`-triggered `ubuntu-latest` job running
  `npm ci` → `npm run typecheck` → `npm test`, gating merges to `main`.
- **Alternatives Considered**:
  - A (Minimal, typecheck-only): rejected — would not have caught the real PR #3 regression
    (widget visibility gated on `isAdmin` alone instead of `isAdmin OR role`), which was a
    behavioral bug a type checker cannot detect.
  - C (Comprehensive): rejected for v1 — a Postgres service container, coverage threshold
    gate, main-push job, and docs-path filtering are disproportionate to the repo's current
    size (7 test files, single package, no self-hosted infra) and would add maintenance
    surface with no evidence of need yet.
- **Impact**: Specification scope, Non-Goals list, acceptance criteria.
- **Decided By**: autonomous brainstorm session (constraints from the input brief resolved
  the scope question; no genuine multi-way ambiguity requiring a user decision was found).

## DEC-002: Coverage-Gate Stretch Item — Overriding the Input Brief

- **Date**: 2026-07-18
- **Task**: Brainstorming (brownfield grounding)
- **Phase**: Grounding / Non-Goals
- **Context**: The input brief described the coverage-gate stretch option as targeting "the
  two files with explicit ≥80% bars (`route-handlers.ts`, `feedback-capture.tsx`)." This is
  not an ADR-style immutable constraint (no ADR/RFC was the input mode here — this was a
  free-form idea plus a handoff-brief-style constraints block), so it is a factual claim to
  verify, not a decision to preserve unchanged.
- **Finding**: Running `npm run test:coverage` in this worktree shows `vitest.config.ts` has
  **no `coverage.thresholds` configured at all**, and `feedback-capture.tsx` statement
  coverage is currently **79.67%** — already below 80%. No enforced or informally-documented
  80% bar exists anywhere in the repo (checked `README.md`, `vitest.config.ts`, and all test
  files for "80" / "threshold" / "coverage" mentions — no hits beyond the npm scripts
  themselves).
  See `brainstorming-notes.md` for the full coverage report and search commands run.
- **Decision**: Do not include a coverage gate (blocking or informational) in this spec's
  scope. Moved from "optional stretch, decide if in scope" to an explicit **Non-Goal** with a
  documented reason (see spec §Non-Goals), rather than carrying an unverified premise forward.
- **Impact**: Removes coverage-gate acceptance criteria from this spec; a future change-spec
  can add it once `feedback-capture.tsx` coverage is deliberately raised above 80% (so the
  gate starts green, not red-on-day-one).
- **Decided By**: autonomous brainstorm session, based on directly-run verification evidence
  (No-Guessing rule: a claim in an input brief is not treated as fact without independent
  confirmation).
