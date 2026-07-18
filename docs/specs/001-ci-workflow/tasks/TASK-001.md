---
id: TASK-001
title: "Add PR-triggered CI workflow (typecheck + test gate)"
spec: docs/specs/001-ci-workflow/2026-07-18--ci-workflow.md
lang: general
status: pending
dependencies: []
timeout: 900
files: [.github/workflows/ci.yml]
kind: impl
reqs: [REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-NR001, REQ-NR002, REQ-NR003, REQ-NR004, REQ-NR005]
ac-mapping: [AC-001, AC-002, AC-004, AC-006, AC-007, AC-008, AC-009, AC-011]
imp-requirements: [REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010]
success-criteria: |
  - [ ] Opening a pull request targeting `main` automatically starts the validation run with no manual action required (AC-001)
  - [ ] Pushing additional commits to an open pull request's branch triggers a new validation run against the updated commit (AC-002)
  - [ ] Dependencies are installed from the committed lockfile (a reproducible install), not a fresh dependency resolution (AC-004)
  - [ ] A pull request that introduces a type error causes the run to fail (AC-006)
  - [ ] A pull request with no type errors causes the type-checking step to succeed (AC-007)
  - [ ] A pull request that breaks an existing test causes the run to fail (AC-008)
  - [ ] A pull request that keeps the full test suite passing (with the opt-in integration test still skipped, as it is today with no database configured) causes the run to succeed (AC-009)
  - [ ] The run reports one merge-relevant pass/fail signal on the pull request, not several ambiguous ones (AC-011)
---

# TASK-001: Add PR-triggered CI workflow (typecheck + test gate)

**Functional Description**: Add a single GitHub Actions workflow that automatically runs
on every pull request targeting `main` (opened, reopened, or updated with new commits),
installs dependencies from the committed lockfile, runs the project's type check, then
runs the test suite — in that order, halting on the first failure — so a single pass/fail
status appears on the pull request.

**Maps to Specification**: AC-001, AC-002, AC-004, AC-006, AC-007, AC-008, AC-009, AC-011

## Acceptance Criteria

- [ ] Opening a pull request targeting `main` automatically starts the validation run with no manual action required (AC-001)
- [ ] Pushing additional commits to an open pull request's branch triggers a new validation run against the updated commit (AC-002)
- [ ] Dependencies are installed from the committed lockfile (a reproducible install), not a fresh dependency resolution (AC-004)
- [ ] A pull request that introduces a type error causes the run to fail (AC-006)
- [ ] A pull request with no type errors causes the type-checking step to succeed (AC-007)
- [ ] A pull request that breaks an existing test causes the run to fail (AC-008)
- [ ] A pull request that keeps the full test suite passing (with the opt-in integration test still skipped, as it is today with no database configured) causes the run to succeed (AC-009)
- [ ] The run reports one merge-relevant pass/fail signal on the pull request, not several ambiguous ones (AC-011)

## Definition of Ready (DoR)

Before starting this task, ensure:
- [ ] No prerequisite tasks are pending (this task has no dependencies).
- [ ] `.github/workflows/` does not currently exist in this repository (verified this
  session — true greenfield addition; no existing workflow to extend or conflict with).
- [ ] `package.json` already exposes the `typecheck` and `test` scripts unchanged — this
  task adds no new npm script.
- [ ] Required tooling (a text editor; no local GitHub Actions runner needed to author the
  YAML) is available.
- [ ] Open Questions #1 and #2 in the spec (main-push job, branch protection) are confirmed
  deferred — this task's scope is the PR-triggered job only.

## Technical Context (from Codebase Analysis)

- **Existing Patterns to Follow**: None — this is the first `.github/workflows/*` file in
  the repository (confirmed via `find .github -type f` returning no results this session).
- **APIs to Integrate With**: `actions/checkout` and `actions/setup-node` (standard,
  widely-used public GitHub Actions — no ADR-referenced internal interface, no
  external-dependency risk).
- **Shared Components**: The repository's own `package-lock.json` (for the reproducible
  `npm ci` install) and existing `npm run typecheck` / `npm test` scripts — verified this
  session to exit 0 on the current `main`-equivalent worktree state (`npm ci`: clean
  install, 221 packages; `npm run typecheck`: exit 0; `npm test`: 6 test files, 52 passed /
  1 skipped, exit 0).
- **Conventions**: `brainstorming-notes.md` records the technical decisions already agreed
  for this workflow: trigger on `pull_request` (never `pull_request_target`, to avoid the
  "pwn request" pattern of running untrusted fork-PR code with write-scoped
  tokens/secrets); steps in order checkout → `actions/setup-node` (Node 20.x, matching
  `@types/node: ^20`) → `npm ci` → `npm run typecheck` → `npm test`; default `GITHUB_TOKEN`
  permissions (read-only, no secrets); single job on `ubuntu-latest`; no `paths-ignore`
  (this spec explicitly rejects docs-only path filtering — see Non-Goals).
- **Architecture Reference**: `docs/specs/architecture.md` §2.2/§2.5 fixes GitHub Actions +
  GitHub-hosted `ubuntu-latest` runner as an immutable architectural constraint for this
  repo — "no self-hosted-runner concerns (unlike GGB/datalena)." This means the workspace's
  self-hosted-runner hardening checklist (mandatory concurrency group, no `cache: npm`,
  `clean: false`, docs-only `paths-ignore`) does **not** apply to this workflow — it is
  explicitly out of scope per the spec's Non-Goals. `cache: npm` on `actions/setup-node` is
  actually the *recommended* setting here (opposite of the self-hosted guidance), since a
  hosted runner has no persistent `node_modules` to lean on instead.
- **Domain Terms**: None — `docs/specs/ontology.md`'s Enrichment Process table records "no
  new domain terms expected" for this spec; this is CI tooling, not a domain change.

## Implementation Details (File names only, no code)

**Files to Create**:
- `.github/workflows/ci.yml` - The PR-triggered CI workflow: `on: pull_request` (types
  `opened`, `reopened`, `synchronize`) targeting `main`; single `ubuntu-latest` job;
  default read-only `GITHUB_TOKEN` permissions (no secrets); steps in order —
  `actions/checkout`, `actions/setup-node` (Node 20.x, `cache: npm`), `npm ci`,
  `npm run typecheck`, `npm test`; no continuation past a failing step (default GitHub
  Actions step-failure behavior already halts the job — do not add `continue-on-error` or
  suppress any step's exit code, per REQ-NR003).

## Test Instructions

This section describes **what** to test, not **how** to implement test code. There is no
application source code in this task — the deliverable is a workflow definition, so
verification is workflow-level, not unit/integration-test-level. Full trigger-based
verification (an actual PR run on GitHub) is the responsibility of TASK-002 (the mandatory
e2e task); this task's own verification is what can be checked before pushing anything.

**1. Workflow Definition Checks:**
   - `.github/workflows/ci.yml`:
     - [ ] The file is valid YAML and matches GitHub Actions workflow schema (no
       unresolved syntax errors — verify with the same YAML parser the repository already
       has available, or GitHub's own workflow-file validation on push).
     - [ ] The `on:` trigger is `pull_request` (not `pull_request_target`) with `branches:
       [main]`, and includes `opened`, `reopened`, and `synchronize` types (AC-001, AC-002).
     - [ ] The job declares no elevated `permissions:` block beyond default read-only, and
       no `secrets:`/`env:` entry referencing a repository secret (REQ-NR001, REQ-NR002).
     - [ ] The step order is checkout → setup-node → `npm ci` → `npm run typecheck` →
       `npm test`, with `npm ci` (not `npm install`) so the lockfile is respected (AC-004).

**2. Local Command Parity Check:**
   - [ ] Run `npm ci && npm run typecheck && npm test` locally in a clean checkout and
     confirm the exact same commands referenced in the workflow file exit 0 today (already
     verified this session: typecheck exit 0; test suite 52 passed / 1 skipped, exit 0) —
     this task changes nothing about those scripts, so this is a parity check, not a new
     test (AC-007, AC-009).

**3. Edge Cases and Error Conditions to Test:**
   - [ ] None invented beyond what the spec requires — type-error and test-failure
     behaviors (AC-006, AC-008) are verified against a real GitHub Actions run in TASK-002,
     not simulated locally in this task, since GitHub Actions' own step-failure propagation
     (not custom workflow logic) is what produces the failing status.

**Test Acceptance Criteria**:
   - [ ] The workflow-definition checks above pass before this task is marked implemented.
   - [ ] No secret, elevated permission, or `continue-on-error`/error-suppression pattern is
     present anywhere in the file (REQ-NR001, REQ-NR002, REQ-NR003).

## Definition of Done (DoD)

This task is complete when:
- [ ] `.github/workflows/ci.yml` exists with the trigger, permissions, and step sequence
  described above.
- [ ] All acceptance criteria listed above are satisfied by the file's content (evidence:
  the file itself, since no code execution is required to confirm structure).
- [ ] The workflow-definition checks in Test Instructions have been performed and pass.
- [ ] No existing file (`package.json`, `vitest.config.ts`, or any `src/**` file) was
  modified — this task creates exactly one new file.
- [ ] TASK-002 (e2e) can proceed: the workflow file is committed so a real pull request can
  trigger it.

**Dependencies**: None

**Implementation Command**:
/developer-kit-specs:specs.task-implementation --lang=general --task="docs/specs/001-ci-workflow/tasks/TASK-001.md"
