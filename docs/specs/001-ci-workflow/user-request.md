# User Request

**Original Input**: Add CI (typecheck + test) to `briankudera/feedback-capture` — currently zero
automated gate on pull requests.

**Key Requirements Mentioned**:
- Gate pull requests targeting `main` with automated `typecheck` and `test` checks.
- Use the existing `package.json` scripts (`typecheck`, `test`) — no new scripts needed.
- GitHub-hosted `ubuntu-latest` runner (no self-hosted-runner infra to target, so the
  self-hosted-runner hardening checklist in workspace conventions does not apply).
- Do not run the opt-in `TEST_DATABASE_URL`-gated migration integration test (no Postgres
  service in CI) — it already skips cleanly without the env var.
- Optional stretch, explicitly flagged as non-binding: a `main`-push job running
  `test:coverage` to catch coverage regressions on `route-handlers.ts` and
  `feedback-capture.tsx`.

**Constraints Provided**:
- `briankudera/feedback-capture` is a brand-new public npm package repo (git-URL distributed,
  no npm registry publish). No `.github/workflows/` exists at all.
- PRs #1–#6 all merged with no automated check gating them.
- Once GGB (spec 027-feedback-capture-package, TASK-007) and briankudera.com
  (TASK-008–012) both consume this package via `github:briankudera/feedback-capture`, an
  uncaught regression in the widget/schema/route-handler-factory could silently break
  feedback capture on both live sites with no automated check catching it before merge.
- Non-goals given up front: no self-hosted-runner setup, no npm registry publish, no branch
  protection / required-checks configuration (a repo-settings action, not something a
  workflow file can do).

**Grounding performed this session** (see `brainstorming-notes.md` for full detail):
- Ran `npm ci && npm run typecheck && npm test` independently in this worktree: typecheck
  exits 0; test suite is 52 passed / 1 skipped, exit 0 — matches the input brief's claim.
- Ran `npm run test:coverage`: **the input brief's claim of "explicit ≥80% bars" on
  `route-handlers.ts` and `feedback-capture.tsx` does not hold** — `vitest.config.ts` has no
  `thresholds` configured at all (no enforcement exists today, informal or otherwise), and
  `feedback-capture.tsx` statement coverage is currently **79.67%**, already below the figure
  cited. This changes the recommendation on the optional coverage-gate stretch item (see
  Decision Log DEC-002).
