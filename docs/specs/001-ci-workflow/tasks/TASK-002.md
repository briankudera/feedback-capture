---
id: TASK-002
title: "End-to-End Testing for CI Workflow (Typecheck + Test Gate)"
spec: docs/specs/001-ci-workflow/2026-07-18--ci-workflow.md
lang: general
status: pending
dependencies: [TASK-001]
timeout: 1800
files: []
kind: e2e
reqs: [REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-NR001, REQ-NR002, REQ-NR003, REQ-NR004, REQ-NR005]
ac-mapping: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012]
imp-requirements: [REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010]
success-criteria: |
  - [ ] AC-001: Opening a pull request targeting `main` automatically starts the validation run with no manual action required
  - [ ] AC-002: Pushing additional commits to an open pull request's branch triggers a new validation run against the updated commit
  - [ ] AC-003: The validation run appears in the pull request's Checks section with a status distinguishable as pending, success, or failure
  - [ ] AC-004: Dependencies are installed from the committed lockfile (a reproducible install), not a fresh dependency resolution
  - [ ] AC-005: The run executes on a GitHub-hosted runner, verifiable by inspecting the run's runner label in the Actions UI
  - [ ] AC-006: A pull request that introduces a type error causes the run to fail
  - [ ] AC-007: A pull request with no type errors causes the type-checking step to succeed
  - [ ] AC-008: A pull request that breaks an existing test causes the run to fail
  - [ ] AC-009: A pull request that keeps the full test suite passing (with the opt-in integration test still skipped, as it is today with no database configured) causes the run to succeed
  - [ ] AC-010: The skipped opt-in integration test does not, by itself, cause the run to fail
  - [ ] AC-011: The run reports one merge-relevant pass/fail signal on the pull request, not several ambiguous ones
  - [ ] AC-012: A maintainer can open the failing step's output directly from the pull request's Checks tab without needing separate credentials
---

# TASK-002: End-to-End Testing for CI Workflow (Typecheck + Test Gate)

**Functional Description**: Validate, against a real pull request on GitHub, that the
workflow added in TASK-001 satisfies every acceptance criterion in the spec — including the
`[SEF]` and `[EXT]` criteria that TASK-001 cannot verify locally (visibility in the Checks
tab, the runner label, log accessibility without extra credentials) and the negative-path
behaviors (type error, test failure, dependency-install failure) that require an actual
GitHub Actions run to observe.

**Maps to Specification**: AC-001 through AC-012 (all criteria — `[IMP]`, `[SEF]`, `[EXT]`)

**Dependencies**: TASK-001 (the workflow file must exist and be committed before any PR
can trigger it)

## Purpose

Confirm that all implemented components — in this case, the single workflow file — work
together correctly against the real GitHub Actions environment, not just as reviewed YAML.

## Test Instructions

**1. Happy-path pull request (verifies AC-001, AC-003, AC-004, AC-005, AC-007, AC-009,
   AC-010, AC-011, AC-012):**
   - [ ] Open a pull request targeting `main` with a trivial, passing change (e.g., a
     comment-only diff) and confirm the validation run starts automatically with no manual
     trigger (AC-001).
   - [ ] Confirm the run appears in the PR's Checks section, visibly transitioning
     pending → success (AC-003).
   - [ ] Inspect the run's logs and confirm `npm ci` was used (not `npm install`) and
     confirms a reproducible install from the lockfile (AC-004).
   - [ ] Inspect the run's runner label in the Actions UI and confirm it is a
     GitHub-hosted `ubuntu-latest` runner (AC-005).
   - [ ] Confirm the typecheck step succeeds with no type errors (AC-007).
   - [ ] Confirm the test suite reports 6 test files / 52 passed / 1 skipped (matching the
     locally-verified baseline) and the overall run succeeds (AC-009).
   - [ ] Confirm the one opt-in `TEST_DATABASE_URL`-gated integration test is reported as
     `skipped` (not `passed` or `failed`) and does not by itself flip the run to failure
     (AC-010).
   - [ ] Confirm exactly one pass/fail status appears on the PR (not multiple ambiguous
     checks) (AC-011).
   - [ ] As a user with default repository read access, open the run's log output directly
     from the PR's Checks tab and confirm no additional credential prompt is required
     (AC-012).

**2. New-commit trigger (verifies AC-002):**
   - [ ] Push an additional commit to the same open pull request's branch and confirm a
     new validation run starts against the updated head commit (not a reuse of the prior
     run's result).

**3. Type-error negative path (verifies AC-006):**
   - [ ] Push a commit to a scratch PR branch that introduces a deliberate TypeScript type
     error and confirm the run fails at the typecheck step, with the specific file/line of
     the type error visible in the run's logs.

**4. Test-failure negative path (verifies AC-008):**
   - [ ] Push a commit to a scratch PR branch that breaks an existing test's assertion and
     confirm the run fails at the test step, with the failing test's name and assertion
     output visible in the run's logs.
   - [ ] Revert or close the scratch branch/PR used for the type-error and test-failure
     negative-path checks once verified — these are throwaway verification branches, not
     part of the feature's deliverable.

**5. Supplemental Verification (nice-to-have, not blocking — not explicitly required by
   the spec's acceptance criteria):**
   - [ ] Optionally confirm a dependency-install failure (e.g., a deliberately corrupted
     lockfile on a scratch branch) halts before the typecheck/test steps run (REQ-004) —
     this scenario is implied by REQ-004 but has no dedicated `[IMP]` AC of its own, so it
     is supplemental rather than a blocking e2e checkpoint.

## Definition of Done (DoD)

This task is complete when:
- [ ] Every AC-001 through AC-012 checkpoint above has been observed against a real GitHub
  Actions run (not simulated) and recorded as passing.
- [ ] Any scratch/throwaway PR branches created solely to exercise the negative paths
  (type-error, test-failure) have been closed/deleted — they must not be left open or
  merged.
- [ ] No workflow file change was needed as a result of this task; if a gap is found
  (e.g., a criterion does not hold), it is fixed by returning to TASK-001, not by silently
  patching the workflow inside this task.

**Implementation Command**:
/developer-kit-specs:specs.task-implementation --lang=general --task="docs/specs/001-ci-workflow/tasks/TASK-002.md"
