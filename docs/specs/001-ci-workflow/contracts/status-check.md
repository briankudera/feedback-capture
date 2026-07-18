# Contract: Pull Request Status-Check Surface

**Boundary type**: Internal/platform boundary (GitHub's native PR Checks tab), not a
formal API this workflow calls directly — the job's own exit code drives it automatically.
**Source**: Functional spec §Integration Requirements — "Source-hosting platform's
pull-request status-check surface"

## Required Inputs (from the validation run)

- Job identity (the workflow/job name as it will appear in the PR's Checks tab).
- Run conclusion: `success` or `failure`, derived strictly from the exit codes of the
  install → typecheck → test sequence (REQ-NR003).

## Success Response / Emitted State

- AC-011: **one** merge-relevant pass/fail signal on the pull request — not several
  ambiguous ones. A single job satisfies this without needing custom status-posting logic.
- AC-003 [SEF]: the run is visible in the PR's Checks section as pending, success, or
  failure — a natural consequence of any GitHub Actions job triggered by `pull_request`,
  not something this workflow must implement separately.

## Error Cases

| Failing step | Status shown | Output reachable from the PR |
|--------------|--------------|-------------------------------|
| Dependency install (e.g., lockfile drift) | `failure`, halted before typecheck/test run (REQ-004) | Installer's error output visible in the run's logs |
| Type-checking (`tsc --noEmit`) | `failure` | Specific file/line of the type error visible in the run's logs |
| Test suite (`vitest run`) | `failure` | Failing test's name and assertion output visible in the run's logs |

AC-012 [EXT]: a maintainer can open the failing step's output directly from the PR's
Checks tab without needing separate credentials — this is GitHub's native behavior for any
public-repo Actions run using default permissions; no additional logging/export step is
required to satisfy it.

## Non-Requirements (explicit)

- No custom status API call (e.g., `Octokit` `createCommitStatus`) is required — the
  workflow's own job conclusion is what GitHub surfaces as the check. Adding one would be
  scope creep not requested by the spec.
- No branch-protection / required-status-check configuration — that is a repository
  settings action, explicitly out of scope (see spec Non-Goals).
