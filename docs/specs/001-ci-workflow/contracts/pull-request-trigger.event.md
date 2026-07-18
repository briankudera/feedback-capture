# Contract: Pull Request Trigger Event

**Boundary type**: Async event trigger (GitHub Actions `on:` event, not an HTTP API)
**Source**: Functional spec §Integration Requirements — "Source-hosting platform's CI
runner (GitHub Actions, per `architecture.md` §2.2)"

## Trigger

| Event | Condition |
|-------|-----------|
| `pull_request` | `opened`, `reopened`, or `synchronize` (new commits pushed), targeting the `main` branch |

REQ-001, REQ-002, AC-001, AC-002.

## Inputs (provided by GitHub, not user-supplied)

- The pull request's head commit SHA (latest commit at trigger time).
- A checkout of the repository at that commit (clean checkout, PR's proposed changes
  only — REQ-002).
- Default `GITHUB_TOKEN` with **read-only** repository permissions (REQ-NR001, REQ-NR002)
  — no elevated token, no repository secret is available to the job or to the PR's code.

## Outputs / Emitted Effects

- A single validation run (workflow run) scoped to that commit SHA.
- Exactly one terminal status check outcome per run: `success` or `failure` (never both,
  never a status independent of the underlying steps — REQ-NR003).

## Error / Edge Cases

| Case | Behavior |
|------|----------|
| External/fork contributor opens the PR | Run still executes automatically, using only default read-only access; no secret exposed to untrusted code (REQ-NR002) |
| New commits pushed to an already-open PR | A new validation run starts against the new head commit; it does not mutate the previous run's recorded outcome (REQ-002, Data Requirements: Validation run) |

## Versioning / Compatibility Notes

None specified by the spec — this is the first CI workflow for this repository (greenfield;
no `.github/workflows/` exists today per `brainstorming-notes.md`).
