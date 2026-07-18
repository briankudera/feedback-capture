# Traceability Matrix: CI Workflow (Typecheck + Test Gate)

**Spec**: docs/specs/001-ci-workflow/2026-07-18--ci-workflow.md
**Generated**: 2026-07-18
**Last Updated**: 2026-07-18

## Coverage Summary

- **Acceptance Criteria**: 12 total (8 `[I]` Implementable / 2 `[S]` Side-Effect / 2 `[E]` External)
- **Covered by Tasks**: 8/8 `[I]` (100%) — TASK-001 implements every `[IMP]` criterion
- **`[S]`/`[E]` e2e coverage**: 4/4 (100%) — all verified as checkpoints in TASK-002
- **Requirements (REQ-IDs)**: 16 total (11 functional + 5 negative)
- **Implemented**: 0/16 (0%) — tasks generated, implementation not yet started

## Coverage Type Legend

| Type | Meaning | Task Generated? | Verified In |
|------|---------|-----------------|-------------|
| `[I]` Implementable | Requires new code (the workflow file) | YES — TASK-001 | TASK-001 (definition checks) + TASK-002 (real-run verification) |
| `[S]` Side-Effect | Natural consequence of `[I]` | NO — e2e verification only | TASK-002 only |
| `[E]` External | Verified externally (platform-native behavior) | NO — e2e checkpoint only | TASK-002 only |

## Acceptance Criteria Matrix

| AC ID | Type | Criterion | Task(s) | E2E Checkpoint? | Status |
|-------|------|-----------|---------|------------------|--------|
| AC-001 | [I] | PR open auto-starts run | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-002 | [I] | New commits trigger new run | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-003 | [S] | Run visible in Checks section (pending/success/failure) | — (e2e only) | YES | Pending |
| AC-004 | [I] | Deps installed from lockfile (`npm ci`) | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-005 | [E] | Runs on GitHub-hosted runner | — (e2e only) | YES | Pending |
| AC-006 | [I] | Type error → run fails | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-007 | [I] | No type errors → typecheck succeeds | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-008 | [I] | Broken test → run fails | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-009 | [I] | Passing suite → run succeeds | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-010 | [S] | Skipped opt-in test doesn't fail the run | — (e2e only) | YES | Pending |
| AC-011 | [I] | One merge-relevant pass/fail signal | TASK-001 | Re-verified in TASK-002 | Pending |
| AC-012 | [E] | Failing output reachable without extra creds | — (e2e only) | YES | Pending |

## Requirement (REQ-ID) Matrix

| REQ ID | Requirement (abridged) | Task(s) | Test Files | Code Files | Status |
|--------|------------------------|---------|------------|------------|--------|
| REQ-001 | Auto-start run on PR open/reopen/update | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-002 | Clean checkout, PR changes only | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-003 | Install deps from lockfile before checks | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-004 | Halt + report failed if install fails | TASK-001, TASK-002 (supplemental) | - | `.github/workflows/ci.yml` | Pending |
| REQ-005 | Run type-checking command | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-006 | Type error → report run failed | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-007 | Run automated test suite | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-008 | Test failure → report run failed | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-009 | Skipped opt-in DB test doesn't fail run | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-010 | Attach single pass/fail status | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-011 | Failing output reachable, no extra creds | TASK-002 | - | - (platform-native; no code) | Pending |
| REQ-NR001 | No secret required/exposed | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-NR002 | No write-scoped access for untrusted PR code | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-NR003 | Never suppress a failing exit code | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-NR004 | Skip ≠ masked pass/fail | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |
| REQ-NR005 | No fresh dependency resolution | TASK-001, TASK-002 | - | `.github/workflows/ci.yml` | Pending |

## Notes

- Every REQ-ID and every `[IMP]` AC maps to the single file TASK-001 creates
  (`.github/workflows/ci.yml`) — this is a genuinely one-file feature; no fan-out across
  files was warranted or invented.
- `Test Files` column is empty throughout: this spec's deliverable is a CI workflow
  definition, not application code with unit/integration test files. Verification is
  workflow-definition review (TASK-001) plus real-run observation (TASK-002), which
  `task-review` will record as evidence in place of a conventional test-file diff.
- Status will be updated to `Implemented` by `task-review` once each task is reviewed
  against this matrix and the underlying spec.
