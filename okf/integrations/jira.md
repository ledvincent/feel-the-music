---
type: Integration
title: Jira
description: How this project's Jira is set up - project key, where acceptance criteria live, issue types, the status for each stage, the dependency link type and the ticket labels; read by /dirox-kit:jira and the other commands
owner: ledvincent
status: stable
resource: https://dirox.atlassian.net/browse/MOOD
tags: [jira]
---
# Jira

<!-- Saved as okf/integrations/jira.md by /dirox-kit:jira setup, in this section order. The commands
     read it instead of guessing. Run setup again when the Jira setup changes: it keeps these values
     and fills only what is missing. -->

## Project
- Site: `dirox.atlassian.net` (cloud ID `95d0c454-e898-47cf-ae79-94d5aee722c2`)
- Project key: `MOOD` (Moodcut, team-managed)
- Kickoff epic: `MOOD-1` (also the parent of every backlog ticket; it closes when they are done)

## Acceptance criteria
- Where: the description, under the heading "Acceptance criteria" (the project has no custom field for them)
- Format: one bullet per criterion, `WHEN … THEN …`, the same shape as the spec scenarios

## Issue types
| Use | Issue type |
|---|---|
| Feature ticket | `Task` |
| Small fix | `Task` |
| Bug found by QC | `Subtask` of the ticket whose scenario failed |
| Group of tickets | `Epic` |

## Status for each stage
| Stage | Jira status |
|---|---|
| Ticket ready to start | `To Do` |
| Proposal approved | `In Progress` |
| Being built | `In Progress` |
| PR ready for review | `In Progress` (the workflow has no review status) |
| Merged | `Done` (moved by people) |

## Dependencies
- Link type: `Blocks` (outward `blocks`, inward `is blocked by`)

## Ticket labels
<!-- The ticket contract (the jira skill). Labels by default, so JQL can sort and filter on them.
     A team that already uses a component or a custom field for one of them names it instead. -->
| What | Where | Values |
|---|---|---|
| Source | label | `src:kickoff`, `src:claude`, `src:pm` |
| Capability | label `cap:<capability>` | the capability name, as in `openspec/specs/` (`footage-ingest`, `shot-search`, `reel-render`, `reel-planning`, `shot-review`), or `tooling` for work outside the specs |
| Size | label `size:<value>` | `trivial`, `normal`, `big` |
| Difficulty | label `difficulty:<value>` | `routine`, `tricky` |

## Conventions
- Every ticket's parent is the epic (`MOOD-1` for the first version).
- Labels or components the team uses: only the contract labels above; no components.
- The description gives size, dependencies (ticket keys), the capability's spec path and the `okf/` concepts it relies on.
- Started before the baseline: none (the project started with `/dirox-kit:kickoff`).
