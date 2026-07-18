# Task List: CI Workflow (Typecheck + Test Gate)

**Specification**: docs/specs/001-ci-workflow/2026-07-18--ci-workflow.md
**Generated**: 2026-07-18
**Language**: general (deliverable is a GitHub Actions YAML workflow, not application code)

## Codebase Analysis Summary

- **Project Structure**: `briankudera/feedback-capture` is a single-package TypeScript npm
  library (git-URL distributed, no build step, no `dist/`). No `.github/` directory exists
  today — true greenfield CI addition. `package.json` already exposes `typecheck`
  (`tsc --noEmit`), `test` (`vitest run`), and `test:coverage` scripts unchanged by this
  spec.
- **Key Patterns**: None to follow for the workflow file itself (first workflow in the
  repo). The repository's architectural constitution (`docs/specs/architecture.md` §2.2,
  §2.5) already fixes GitHub Actions + GitHub-hosted `ubuntu-latest` as the CI
  infrastructure choice and explicitly excludes the self-hosted-runner hardening checklist
  (concurrency groups, `cache: npm` avoidance, `clean: false`, docs-only path gating) —
  none of that applies to a GitHub-hosted runner.
- **Integration Points**: GitHub Actions' `pull_request` event trigger and GitHub's native
  PR Checks-tab status surface — both are platform-native behaviors triggered by a single
  job's exit code, requiring no custom status-posting logic.

## Task Index

| Task ID | Title | Technical Focus | Status | Dependencies |
|---------|-------|-----------------|--------|--------------|
| [TASK-001](tasks/TASK-001.md) | Add PR-triggered CI workflow (typecheck + test gate) | `.github/workflows/ci.yml` | [ ] | - |
| [TASK-002](tasks/TASK-002.md) [E2E] | End-to-End Testing for CI Workflow | Real GitHub Actions PR run verification | [ ] | TASK-001 |
| [TASK-003](tasks/TASK-003.md) [CLEANUP] | Code Cleanup & Workspace Hygiene | `.github/workflows/ci.yml` final pass | [ ] | TASK-002 |

**Legend**:
- [E2E] = End-to-end test task (validates entire feature workflow)
- [CLEANUP] = Code cleanup task (uses specs-code-cleanup skill)

## Tasks

Each task has its own detailed file with technical context:
- [TASK-001](tasks/TASK-001.md): Add PR-triggered CI workflow (typecheck + test gate)
- [TASK-002](tasks/TASK-002.md): End-to-End Testing for CI Workflow (validates entire
  feature against a real GitHub Actions run)
- [TASK-003](tasks/TASK-003.md): Code Cleanup & Workspace Hygiene (final cleanup)

## Task Type Summary

- **Implementation Tasks** (TASK-001): Core feature implementation — a single workflow
  file satisfies all 8 `[IMP]` acceptance criteria at once; no file collisions, no split
  needed (1 file to create, 0 files to modify — well under the split threshold).
- **E2E Test Task** (TASK-002): End-to-end testing of the complete workflow, including the
  `[SEF]`/`[EXT]` criteria that cannot be verified from the YAML alone.
- **Cleanup Task** (TASK-003): Final code quality and workspace hygiene cleanup.

## Quality Gates Passed

- **Spec Fidelity Gate**: PASS — spec's Acceptance Criteria section already carries the
  `[IMP]`/`[SEF]`/`[EXT]` taxonomy natively (no retroactive tagging needed); 8/12 = 66.7%
  `[IMP]` (passes the 60% rule per the spec's own note).
- **Bounded Context Boundary Check**: 0 cross-boundary tasks — the sole new file
  (`.github/workflows/ci.yml`) sits outside the package's `Feedback Capture` bounded
  context entirely (it is repository tooling, not domain code); no existing domain file is
  touched.
- **External Dependency Pre-Flight**: 0 flagged — `actions/checkout` and
  `actions/setup-node` are standard, widely-used public GitHub Actions, not
  ADR-referenced internal interfaces requiring verification.
- **File Collision Detection**: 0 collisions — TASK-001 creates exactly one new file;
  TASK-002 and TASK-003 create no new files (verification and cleanup pass only).
- **Test Fidelity Check**: 0 invented scenarios kept in blocking test instructions — a
  dependency-install-failure check (implied by REQ-004 but with no dedicated `[IMP]` AC)
  was placed under TASK-002's "Supplemental Verification" (non-blocking), not treated as a
  mandatory e2e checkpoint.

## Dependency Structure

```
TASK-001 (impl, no deps)
    ↓
TASK-002 (e2e, depends on TASK-001)
    ↓
TASK-003 (cleanup, depends on TASK-002)
```

Linear chain — no fan-out, no circular dependencies, no cross-boundary or
external-dependency risk flags on any task.

## Spec Size Status

3 total tasks (1 implementation + 1 e2e + 1 cleanup) — well under the 15-task limit. No
rejection or brainstorm-split recommendation needed.
