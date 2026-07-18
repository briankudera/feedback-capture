# Functional Specification: CI Workflow (Typecheck + Test Gate)

**Spec ID**: 001-ci-workflow
**Date**: 2026-07-18
**Status**: Draft
**Version**: 1.0
**Feature Summary**: Gives contributors and maintainers of `briankudera/feedback-capture` an
automated pass/fail check — type validation plus the existing test suite — on every pull
request targeting `main`, so a regression in the widget, schema, or route-handler factory is
caught before merge instead of after it reaches a consuming site.

---

## Business Context

### Problem Statement

`briankudera/feedback-capture` has no automated gate on pull requests today. All six merged
PRs (#1–#6) relied on contributors remembering to run `npm run typecheck` / `npm test`
locally, or (for #3, #4, #6, merged within seconds of opening) on no verification step at
all. This package is about to gain real downstream consumers — GGB (per spec
027-feedback-capture-package, TASK-007) and briankudera.com (TASK-008–012) both plan to
depend on it via `github:briankudera/feedback-capture`. Once that happens, an uncaught
regression in the widget, payload schema, or route-handler factory does not just break a
demo — it silently breaks feedback capture on two live sites, discovered only after the fact.
The problem is the absence of any automated backstop between "PR opened" and "PR merged."

### Target Users

| User Type | Description | Primary Goal |
|-----------|-------------|--------------|
| Contributor | Anyone opening a pull request against `briankudera/feedback-capture` (including the repo owner working solo, or an automated/orchestrator-driven PR flow — see PRs #3/#4/#6) | Get fast, automatic feedback on whether their change is safe to merge, without relying on remembering to run checks locally |
| Maintainer / reviewer | The person deciding whether to merge a pull request | See one clear pass/fail signal on the PR before approving, instead of trusting an unverified local run |
| Downstream consumer (indirect) | GGB and briankudera.com, once they depend on this package via a git-URL dependency | Not be exposed to a regression that a merged PR could have caught automatically |

### System Fit

This is a process/tooling capability, not a product-domain feature. `docs/specs/ontology.md`
and `docs/specs/architecture.md` describe the package's single bounded context (Feedback
Capture: widget, schema, route-handler factory, storage/auth ports); this spec adds no new
domain concept to that glossary — it adds a repository-operations capability that protects
the existing domain code from regressing unnoticed. `architecture.md` §2.2 already fixed the
infrastructure choice (GitHub Actions, GitHub-hosted `ubuntu-latest` runner, no self-hosted
tie-in) as part of this project's architectural constitution; this spec treats that choice as
a given, not a decision to re-litigate.

---

## Functional Requirements

### PR Validation Trigger

**Context**: The gate must run automatically, without a human remembering to invoke it, on
every proposed change to `main`.

| ID | Requirement | Trigger Type |
|----|-------------|--------------|
| REQ-001 | WHEN a pull request is opened, reopened, or updated with new commits targeting `main` THEN the CI system SHALL automatically start a validation run against that pull request's latest commit | Event |
| REQ-002 | The CI system SHALL run the validation against a clean checkout containing only the pull request's proposed changes | Generic |

### Dependency Installation

**Context**: Both the type check and the test suite depend on the project's installed
dependencies being present and matching the committed lockfile.

| ID | Requirement | Trigger Type |
|----|-------------|--------------|
| REQ-003 | The CI system SHALL install project dependencies from the committed dependency lockfile before running any validation check | Generic |
| REQ-004 | IF dependency installation fails THEN the CI system SHALL halt the run and SHALL report the run as failed without executing the type-check or test steps | Feature |

### Type Validation

**Context**: Catch type errors that would otherwise only surface when a consuming
application builds against this package.

| ID | Requirement | Trigger Type |
|----|-------------|--------------|
| REQ-005 | The CI system SHALL run the project's type-checking command against the pull request's code | Generic |
| REQ-006 | IF the type-checking command reports any type error THEN the CI system SHALL report the run as failed | Feature |

### Automated Test Execution

**Context**: Catch behavioral regressions (e.g., the kind fixed in PR #3, where widget
visibility was gated on `isAdmin` alone instead of `isAdmin OR role`) that type-checking
alone cannot detect.

| ID | Requirement | Trigger Type |
|----|-------------|--------------|
| REQ-007 | The CI system SHALL run the project's automated test suite against the pull request's code | Generic |
| REQ-008 | IF any test in the suite fails THEN the CI system SHALL report the run as failed | Feature |
| REQ-009 | IF the opt-in database-integration test is skipped because no database connection is configured THEN the CI system SHALL still consider the run successful, provided every other test passes | Feature |

### Status Reporting

**Context**: The signal has to be legible to a reviewer deciding whether to merge, without
requiring them to dig through raw logs first.

| ID | Requirement | Trigger Type |
|----|-------------|--------------|
| REQ-010 | WHEN a validation run finishes THEN the CI system SHALL attach a single pass/fail status to the pull request reflecting the run's outcome | Event |
| REQ-011 | WHEN a validation run's status is failed THEN the CI system SHALL make the failing step's output (installation, type errors, or test failures) reachable from the pull request without requiring separate credentials or access | Event |

### Data Requirements

| Data Entity | Purpose | Lifecycle | Constraints |
|-------------|---------|-----------|-------------|
| Validation run | One execution of the install → typecheck → test sequence for a specific pull request commit | Created when a pull request is opened/updated; reaches a terminal pass/fail state when the sequence finishes | Tied to exactly one commit SHA; a new commit on the same PR creates a new run, it does not mutate the prior one |
| Status check | The pass/fail signal a reviewer sees attached to the pull request | Created in a pending state when the run starts; updated to its terminal state (success/failure) when the run finishes | Must reflect the actual outcome of the install/typecheck/test steps — never a status independent of what those steps reported |

---

## User Interactions

### Primary User Flow: Contributor opens a pull request

```
Contributor → opens/updates PR against main → validation run starts automatically →
  install deps → typecheck → test → status posted on PR → reviewer sees pass/fail
```

1. **Open or update a PR**: A contributor opens a pull request targeting `main`, or pushes
   additional commits to an already-open PR's branch.
2. **Automatic run starts**: No action beyond opening/updating the PR is required; the
   validation run begins against the PR's latest commit.
3. **Checks execute in order**: dependencies are installed from the lockfile, then the type
   check runs, then the test suite runs.
4. **Outcome**: A single pass/fail status appears on the pull request. A reviewer can merge
   with confidence on green, or open the failure details on red without needing to reproduce
   the failure locally first.

### Alternative Paths

| Path | Trigger | Behavior |
|------|---------|----------|
| Docs-only or non-code change | A PR only touches files like `README.md` | The validation run still executes (no path-based skip in this spec's scope — see Non-Goals); given the check's low cost (a few seconds on a free hosted runner), this is an accepted trade-off rather than a gap |
| External/fork contributor PR | A contributor without write access to the repository opens a PR | The run still executes automatically, using only default read-only repository access — no elevated token or secret is exposed to the PR's code (see Negative Requirements) |
| Opt-in integration test present but unconfigured | The test suite includes a database-dependent test that is not enabled in this environment | That single test reports as skipped, not failed, and does not affect the overall pass/fail outcome |

### Error Scenarios

| Error Condition | System Response | User Message |
|----------------|----------------|--------------|
| Dependency installation fails (e.g., lockfile drift) | Run halts immediately; type-check and test steps do not execute | The pull request's status shows failed at the installation step, with the installer's error output visible in the run's logs |
| Type-checking reports an error | Run fails at that step | The pull request's status shows failed, with the specific file/line of the type error visible in the run's logs |
| A test fails | Run fails at that step | The pull request's status shows failed, with the failing test's name and assertion output visible in the run's logs |

---

## Acceptance Criteria

> **Taxonomy**: Every criterion is tagged `[IMP]`, `[SEF]`, or `[EXT]`.
> **60% Rule**: 8 of 12 criteria below are `[IMP]` (66.7%) — passes the rule.

### PR Gate Trigger & Execution

| ID | Criterion | Taxonomy |
|----|-----------|----------|
| AC-001 | Opening a pull request targeting `main` automatically starts the validation run with no manual action required | [IMP] |
| AC-002 | Pushing additional commits to an open pull request's branch triggers a new validation run against the updated commit | [IMP] |
| AC-003 | The validation run appears in the pull request's Checks section with a status distinguishable as pending, success, or failure | [SEF] |

### Dependency & Environment

| ID | Criterion | Taxonomy |
|----|-----------|----------|
| AC-004 | Dependencies are installed from the committed lockfile (a reproducible install), not a fresh dependency resolution | [IMP] |
| AC-005 | The run executes on a GitHub-hosted runner, verifiable by inspecting the run's runner label in the Actions UI | [EXT] |

### Type Validation Gate

| ID | Criterion | Taxonomy |
|----|-----------|----------|
| AC-006 | A pull request that introduces a type error causes the run to fail | [IMP] |
| AC-007 | A pull request with no type errors causes the type-checking step to succeed | [IMP] |

### Test Gate

| ID | Criterion | Taxonomy |
|----|-----------|----------|
| AC-008 | A pull request that breaks an existing test causes the run to fail | [IMP] |
| AC-009 | A pull request that keeps the full test suite passing (with the opt-in integration test still skipped, as it is today with no database configured) causes the run to succeed | [IMP] |
| AC-010 | The skipped opt-in integration test does not, by itself, cause the run to fail | [SEF] |

### Status Reporting

| ID | Criterion | Taxonomy |
|----|-----------|----------|
| AC-011 | The run reports one merge-relevant pass/fail signal on the pull request, not several ambiguous ones | [IMP] |
| AC-012 | A maintainer can open the failing step's output directly from the pull request's Checks tab without needing separate credentials | [EXT] |

---

## Integration Requirements

| External System | Capability Needed | Data Exchanged | Frequency |
|----------------|-------------------|----------------|-----------|
| Source-hosting platform's CI runner (GitHub Actions, per `architecture.md` §2.2) | Execute the install/typecheck/test sequence in response to pull-request events | Repository checkout at the PR's head commit; the run's pass/fail outcome | Once per PR open/reopen/update event |
| Source-hosting platform's pull-request status-check surface | Attach and update the run's pass/fail status on the pull request | Job identity, run conclusion (success/failure), link to run logs | Once per validation run, updated to terminal state on completion |

---

## Negative Requirements

The system SHALL NOT:

### Security
- REQ-NR001: The CI workflow SHALL NOT require or expose any repository secret; type-checking and test execution need no credentials.
- REQ-NR002: The CI workflow SHALL NOT execute an external contributor's proposed code with write-scoped repository access or exposed secrets — it SHALL run with default read-only access, since a pull request's code is untrusted until reviewed.

### Reliability
- REQ-NR003: The CI workflow SHALL NOT report a passing status when the dependency-install, type-check, or test step exits with a failure — it SHALL NOT suppress or swallow a failing exit code on any of those three steps.
- REQ-NR004: The CI workflow SHALL NOT treat the opt-in database-integration test's environment-gated skip as a masked failure or a masked pass reported some other way — it SHALL rely on the test runner's own "skipped" outcome, which is distinct from both "passed" and "failed."

### Reproducibility
- REQ-NR005: The CI workflow SHALL NOT resolve dependencies freshly against version ranges for each run — it SHALL install from the committed lockfile so every run installs the same dependency graph the contributor tested locally.

---

## Non-Goals

This feature does NOT include:

- **Self-hosted runner setup or hardening**: There is no self-hosted-runner infrastructure for this repo to target (unlike GGB/datalena), so the workspace's self-hosted-runner checklist (concurrency groups, `cache: npm` avoidance, `clean: false`, docs-only path gating) does not apply here — a GitHub-hosted runner has none of the shared-contention problems that checklist exists to solve.
- **npm registry publishing**: This package is distributed exclusively as a git-URL dependency (`github:briankudera/feedback-capture`); this spec adds no publish step, versioning workflow, or registry credentials.
- **Branch protection / required-status-check configuration**: Making this new check actually block merges via GitHub's branch protection rules is a repository-settings action, not something a workflow file accomplishes on its own; it is explicitly deferred as its own follow-up once this workflow exists and has run successfully at least once.
- **A blocking (or informational) code-coverage gate**: The input brief for this spec assumed an existing "≥80% bar" on `route-handlers.ts` and `feedback-capture.tsx`; verification this session found `vitest.config.ts` has no coverage thresholds configured at all, and `feedback-capture.tsx` is currently at 79.67% statement coverage — already below that figure. Turning on a coverage gate today would fail immediately on a pre-existing shortfall unrelated to whatever a given PR changes, which would undermine trust in the new gate rather than build it. Deferred until coverage is deliberately raised first (see `decision-log.md` DEC-002).
- **Running the opt-in database-integration test in CI**: No Postgres service is provisioned for this workflow; the one test that needs `TEST_DATABASE_URL` continues to skip cleanly, exactly as it does in every contributor's local environment without that variable set.
- **New npm scripts or changes to existing ones**: `package.json` already exposes `typecheck`, `test`, and `test:coverage`; this spec only wires an existing script into an automatic trigger, it does not add, rename, or modify any script.
- **A validation job triggered on pushes to `main`** (as opposed to on pull requests): the PR-time gate is the priority; a post-merge/main-push job is deferred (see Open Questions) rather than bundled into this spec's scope.

---

## Assumptions

- CI uses a current Node.js LTS major version (20.x) as the runtime, since `package.json` pins no `engines` field but its `devDependencies` carry `@types/node: ^20` as the only signal of an intended major version.
- No `TEST_DATABASE_URL` (or any other secret) is configured for this workflow, so the opt-in migration-integration test always runs in its skipped branch in CI — this is the expected steady state, not a temporary gap.
- `main` is the only branch that needs this gate today; `git branch -a` shows no other long-lived integration branch in this repository.
- The two moderate `npm audit` advisories surfaced by a plain `npm ci` in this worktree are pre-existing and unrelated to this spec; this spec does not add a dependency-audit gate.

---

## Open Questions

| # | Question | Impact if Unresolved | Default Assumption |
|---|----------|---------------------|-------------------|
| 1 | Should a second validation job also run on pushes to `main` (post-merge), to catch issues a squash-merge combination could introduce that individual PR checks didn't see? | Low — a gap only in the rare case where two independently-green PRs combine badly | Deferred: not included in this spec; the PR-time gate is the priority for the first CI addition to a zero-CI repo |
| 2 | Once this workflow lands and is proven, should branch protection on `main` require it before merge? | Medium — without a required check, the gate is advisory (visible but not merge-blocking) until configured | Deferred: explicitly out of scope for this spec (see Non-Goals); recommended as an immediate follow-up once this workflow has a few successful runs |
| 3 | Should the coverage gate be revisited once `feedback-capture.tsx` coverage is deliberately raised above 80%? | Low — coverage tracking is a quality signal, not a correctness gate | Deferred: not included in this spec (see Non-Goals and `decision-log.md` DEC-002); a future change-spec can add it once the pre-existing shortfall is resolved first |
