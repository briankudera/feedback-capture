# Data Model: CI Workflow (Typecheck + Test Gate)

**Spec**: docs/specs/001-ci-workflow/2026-07-18--ci-workflow.md
**Generated**: 2026-07-18

---

## Scope Note

This spec adds a repository-operations capability (a GitHub Actions workflow), not a
product-domain feature. `docs/specs/ontology.md`'s Enrichment Process table already records
"no new domain terms expected" for this spec. The two "entities" below are the spec's own
**Data Requirements** table (verbatim source), describing GitHub Actions/GitHub's native
run and check-status concepts — not application data this package persists. Both are
sourced directly from the functional specification (§ Data Requirements); nothing here is
`(derived)`.

## Entities

### Validation run

| Field | Description |
|-------|-------------|
| Purpose | One execution of the install → typecheck → test sequence for a specific pull request commit |
| Lifecycle | Created when a pull request is opened/updated; reaches a terminal pass/fail state when the sequence finishes |
| Identity constraint | Tied to exactly one commit SHA; a new commit on the same PR creates a new run, it does not mutate the prior one |
| Native representation | A GitHub Actions workflow run (`on: pull_request`), not a table row this package owns |

### Status check

| Field | Description |
|-------|-------------|
| Purpose | The pass/fail signal a reviewer sees attached to the pull request |
| Lifecycle | Created in a pending state when the run starts; updated to its terminal state (success/failure) when the run finishes |
| Constraint | Must reflect the actual outcome of the install/typecheck/test steps — never a status independent of what those steps reported (REQ-NR003) |
| Native representation | GitHub's PR Checks-tab status for the job, driven automatically by the job's own exit code — no explicit status-posting API call is implemented by this workflow |

## Relationships

```
Pull Request (GitHub-native)
  └─ 1..N Validation run  (one per triggering commit: open/reopen/push)
        └─ 1 Status check  (pending → success | failure, terminal)
```

- One pull request has many validation runs over its lifetime (one per commit event);
  each run maps to exactly one status check that supersedes the prior one on the same PR.

## State Transitions (Status check)

```
pending --(install/typecheck/test all succeed, incl. gated-skip for the
            opt-in integration test)--> success
pending --(install fails, OR typecheck reports an error, OR any test fails)--> failure
```

No other states exist. There is no "cancelled" or "manual override" state in this spec's
scope (branch protection / required-status-check enforcement is an explicit Non-Goal).

## Business Invariants

- A validation run's status check MUST reflect the real exit code of install, typecheck,
  and test steps — REQ-NR003 forbids swallowing or suppressing a failing exit code on any
  of the three.
- The opt-in `TEST_DATABASE_URL`-gated integration test reports `skipped`, which is
  neither `passed` nor `failed`, and by itself must not flip the run to `failure`
  (REQ-009, REQ-NR004, AC-010).
- Dependency installation MUST use the committed lockfile, never a fresh resolution
  against version ranges (REQ-003, REQ-NR005).
