---
type: Decision
title: A fixed emotion list
description: One list of 12 emotions, defined once in code, is shared by zero-shot tagging, the vision-language model and search.
owner: ledvincent
status: stable
tags: [decision]
---
# A fixed emotion list

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/mood-1-kickoff-2026-10-12/`

## Context
Tagging, captioning and search must speak the same words, or a heartbroken section could match a shot tagged with a synonym.

## Decision
The starting list, approved in review: `heartbreak`, `longing`, `tenderness`, `intimacy`, `joy`, `euphoria`, `nostalgia`, `loneliness`, `melancholy`, `hope`, `calm`, `tension`. Defined once in code. The vision-language model's output is checked against it.

## Alternatives considered
- Free-text emotions: impossible to filter on reliably.

## Consequences
- The owner expects to add emotions later, especially happier tones. Adding one is a list change plus a `pipeline_version` bump, so the next ingest re-tags existing shots ([003](/decisions/003-one-gpu-model-at-a-time.md)).
