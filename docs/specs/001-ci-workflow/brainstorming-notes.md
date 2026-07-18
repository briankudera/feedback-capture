# Brainstorming Notes: CI Workflow (typecheck + test gate)

**Date**: 2026-07-18

These notes capture technical context discussed during brainstorming that the functional
spec deliberately keeps out (WHAT, not HOW), for use by `spec-to-tasks`.

## Existing surface / brownfield reconciliation

Domain nouns extracted from the feature idea: "CI", "typecheck", "test", "pull request",
"workflow".

Verified this session (worktree: `feedback-capture-worktrees/001-ci-workflow-spec`, branch
`spec/001-ci-workflow`):

- `find .github -type f` → **no `.github/` directory exists at all.** Confirmed via `git log
  --oneline -20 --all`: 14 commits, PRs #1–#6, none reference CI, workflows, or Actions.
  This is a true greenfield addition — there is no existing CI surface to extend or conflict
  with.
- `package.json` scripts already present and correct, no changes needed:
  - `"typecheck": "tsc --noEmit"`
  - `"test": "vitest run"`
  - `"test:coverage": "vitest run --coverage"`
  - `"test:watch": "vitest"`
- No `engines` field in `package.json` — no Node version is pinned anywhere in the repo.
  `devDependencies` carries `@types/node: ^20`, which is the only signal toward an intended
  Node major version.
- Independently ran (not just trusting the input brief) in this worktree:
  - `npm ci` → clean install, 221 packages, 2 pre-existing moderate `npm audit` advisories
    (not investigated further — out of scope for a CI-gate spec).
  - `npm run typecheck` → exit 0, no errors.
  - `npm test` → **Test Files: 6 passed | 1 skipped (7). Tests: 52 passed | 1 skipped (53).
    Exit 0.** Matches the input brief's claim exactly.
  - `npm run test:coverage` → exit 0. Coverage report:
    ```
    All files          |   85.27 |    72.85 |   82.92 |   89.01
     feedback-capture.tsx |   79.67 |    66.31 |   75.86 |   82.88
     route-handlers.ts    |   93.65 |    89.74 |     100 |   98.33
     validation-helpers.ts|     100 |       50 |     100 |     100
    ```
- `vitest.config.ts` has **no `coverage.thresholds` block at all** — there is no enforced
  (or even soft/informal-but-configured) coverage bar anywhere in the repo today. The input
  brief's framing ("two files with explicit ≥80% bars") does **not** match what's on disk.
  `feedback-capture.tsx` statement coverage is 79.67% — already under 80%. **This directly
  changes the recommendation**: enabling a blocking ≥80% coverage gate today would fail on
  an unrelated pre-existing shortfall, not on the PR under review, which would immediately
  erode trust in the new gate. See Decision Log DEC-002.
- The one skipped test (`migration.integration.test.ts`) uses vitest's `describe.skipIf(!TEST_DATABASE_URL)`
  — confirmed by reading the file. Vitest reports this as "skipped" in the run summary, not
  "passed" — so a CI consumer reading the job's overall exit code correctly sees the run as
  green without a Postgres service being provisioned.
- `docs/specs/architecture.md` (created earlier this session, same worktree ancestor) already
  anticipated this exact spec: §2.2 lists "CI/CD: GitHub Actions (GitHub-hosted runner) — N/A
  — typecheck + test gate on PRs to `main`", and §2.5 explicitly notes "no self-hosted-runner
  concerns (unlike GGB/datalena)". `docs/specs/ontology.md`'s Enrichment Process table already
  has a row: "`spec-to-tasks` (spec 001-ci-workflow) — No new domain terms expected — this
  spec is CI tooling, not a domain change." Both are treated as **immutable architectural
  constraints** for this spec (Phase 0 ADR-constraint rule) — GitHub Actions + hosted runner
  is not re-litigated here, and no ontology update is expected or performed.

## Technical decisions discussed (deferred to a technical-plan / tasks, not the functional spec)

- Trigger: `on: pull_request` targeting `main` (not `pull_request_target`, to avoid running
  untrusted fork-PR code with write-scoped tokens/secrets — classic "pwn request" pattern).
- Steps: checkout → `actions/setup-node` (Node 20.x, matching `@types/node: ^20`) → `npm ci`
  → `npm run typecheck` → `npm test`.
- Default `GITHUB_TOKEN` permissions (read-only) — no secrets needed for this workflow.
- Single job, `ubuntu-latest`. None of the self-hosted-runner hardening checklist from
  workspace conventions applies (mandatory concurrency group, no `cache: npm`, `clean: false`,
  docs-only paths-ignore) — those are specifically for shared self-hosted runners under
  contention; a GitHub-hosted `ubuntu-latest` runner has no such contention, and `cache: npm`
  is actually *recommended* on hosted runners (opposite of the self-hosted guidance) since
  there's no local `node_modules` persistence to lean on instead.
- No `paths-ignore` / docs-only skip: this is a small package (7 test files, ~4.5s test
  duration) on a free hosted runner — the cost of always running typecheck+test is
  negligible, so added path-filtering complexity isn't justified for v1.

## Approaches considered (see decision-log.md DEC-001 for the formal record)

- **A — Minimal (typecheck only)**: rejected. The repo's actual regression history (PR #3
  fixed a real widget-gating bug: `isAdmin` alone instead of `isAdmin OR role`) is exactly
  the kind of behavioral regression a type checker cannot catch; test execution is cheap
  (~4.5s) and already exists.
- **B — Balanced (typecheck + test, PR-triggered, no coverage gate)**: **chosen.** Matches
  the repo's current size, risk profile, and consumer count (2 known consumers so far).
- **C — Comprehensive (B + Postgres service for the integration test + coverage threshold
  gate + main-push job + path filtering)**: rejected for v1 as disproportionate; explicitly
  deferred (see Non-Goals in the spec) until `feedback-capture.tsx` coverage clears 80% and/or
  a second/third consumer materializes (e.g., the pending `datalena-feedback-capture-integration`
  handoff mentioned in `architecture.md` §1.4).
