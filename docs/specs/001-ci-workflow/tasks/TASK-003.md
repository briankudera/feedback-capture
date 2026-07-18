---
id: TASK-003
title: "Code Cleanup & Workspace Hygiene for CI Workflow"
spec: docs/specs/001-ci-workflow/2026-07-18--ci-workflow.md
lang: general
status: completed
dependencies: [TASK-002]
files: [.github/workflows/ci.yml]
kind: cleanup
reqs: []
ac-mapping: []
imp-requirements: []
success-criteria: |
  - [x] `.github/workflows/ci.yml` has no debug artifacts (no commented-out steps, no
    stray `echo`/debug-only steps added during TASK-001/TASK-002 verification)
  - [x] No scratch/throwaway branches or PRs created during TASK-002's negative-path
    verification remain open
  - [x] The workflow file's YAML formatting/indentation is consistent and passes a final
    lint/validation pass
  - [x] No unrelated file was modified while producing this feature
---

# TASK-003: Code Cleanup & Workspace Hygiene for CI Workflow

**Functional Description**: Final cleanup pass over the single artifact this spec
produces (`.github/workflows/ci.yml`) using the `specs-code-cleanup` skill, removing any
debug/temporary content introduced while authoring or verifying the workflow, and
confirming no scratch verification branches from TASK-002 were left behind.

**Dependencies**: TASK-002 (e2e test task)

**Purpose**: Ensure production-ready quality for the workflow file and a clean workspace
before this spec is considered complete.

## Must Perform

- [x] Remove any debug-only steps (e.g., a temporary `- run: env` or `- run: cat
  package-lock.json` step added while diagnosing TASK-002 verification) from
  `.github/workflows/ci.yml` — the final file should contain only the steps described in
  TASK-001 (checkout, setup-node, `npm ci`, `npm run typecheck`, `npm test`).
- [x] Remove commented-out YAML blocks or TODO/debug comments left over from iteration.
- [x] Confirm no scratch branches or PRs used to exercise TASK-002's type-error/test-failure
  negative paths remain open in the repository.
- [x] Run a final YAML lint/validation pass on `.github/workflows/ci.yml`.
- [x] Confirm no file outside `.github/workflows/ci.yml` was touched by this feature (no
  unrelated changes to `package.json`, `vitest.config.ts`, or any `src/**` file).
- [x] Verify indentation and formatting are consistent throughout the file.

## Definition of Done (DoD)

This task is complete when:
- [x] `.github/workflows/ci.yml` contains only the steps and configuration required by the
  spec, with no debug or temporary content.
- [x] All scratch verification branches/PRs from TASK-002 are closed.
- [x] The workspace has no other lingering artifacts from this spec's implementation or
  verification work.

## Evidence

- `git show --stat 500a86f` (TASK-001's implementation commit): touches only
  `.github/workflows/ci.yml` (26 insertions, 1 file) — no unrelated files.
- Manual review of `.github/workflows/ci.yml` on `main`: 26 lines, matches
  TASK-001's spec exactly (checkout, setup-node, `npm ci`, `npm run
  typecheck`, `npm test`), no comments, no debug steps.
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
  parsed cleanly — valid YAML.
- `gh pr list --state open` and `gh api repos/.../branches` (post-cleanup):
  no open PRs, only `main` and `spec/001-ci-workflow` branches remain — the
  TASK-002 scratch branch/PR is gone.

**Implementation Command**:
/developer-kit-specs:specs-code-cleanup --lang=general --task="docs/specs/001-ci-workflow/tasks/TASK-003.md"
