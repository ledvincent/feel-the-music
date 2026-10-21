## Ticket
Jira: <!-- PROJ-123 -->
Size: <!-- trivial · normal · big -->
OpenSpec change: <!-- openspec/changes/<change>/ (or archive/<change>-<date>/ once closed); "none" for a trivial change -->

## What changed
<!-- Two or three lines. -->

## Scenarios and tests
<!-- One row per spec scenario. Trivial change: the tests that cover it. -->
| Requirement | Scenario | Test |
|---|---|---|

## Test cases
<!-- From test-cases/<KEY>.md and the verification. First line: "QC: required" or "QC: none".
     One row per case; a manual case shows "QC" as its test. With QC required, CI waits for a QC reviewer's approval. -->
| Case | Title | Proof | Test | Result |
|---|---|---|---|---|

## Knowledge (okf/)
<!-- Concepts added, updated or deprecated, or "No OKF change: <reason>". Required: CI fails when this section is empty.
     A decision marked "Decision record needed" that is not recorded: one "No decision record: <decision> - <reason>" line. -->

## Model use
<!-- The table from openspec/changes/<change>/model-use.md (filled by /dirox-kit:close-change): each agent run with its model, effort, tokens and escalations. -->

## Checklist
- [ ] Big change only: proposal PR merged before code, BA and Architect approved
- [ ] Every scenario has a test whose name contains the scenario name
- [ ] `/dirox-kit:verify` has no blocking findings (not needed for trivial)
- [ ] OKF retro done, and the Dirox CI checks pass (`specs-and-knowledge`, `pr-checks`)
- [ ] OpenSpec change archived (not needed for trivial)

## Follow-ups
<!-- Work found but not done, as suggested Jira tickets. -->
