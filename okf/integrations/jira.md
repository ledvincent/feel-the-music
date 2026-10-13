---
type: Integration
title: Jira
description: How this project's Jira is set up - project key, where acceptance criteria live, issue types and the status for each stage; read by /dirox-kit:jira and the other commands
owner: ledvincent
status: stable
resource: https://dirox.atlassian.net/browse/MOOD
tags: [jira]
---
# Jira

<!-- Saved as okf/integrations/jira.md by /dirox-kit:jira. The commands read it instead of
     guessing. A person confirms each value; update it when the Jira setup changes. -->

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

## Conventions
- Every ticket's parent is the epic (`MOOD-1` for the first version).
- Labels: the size (`size-normal` or `size-big`) and the capability (`footage-ingest`, `shot-search`, `reel-render`, `reel-planning`, `shot-review`), or `tooling` for work outside the specs.
- The description gives size, dependencies (ticket keys), the capability's spec path and the `okf/` concepts it relies on.
