---
type: Decision
title: LanceDB, one row per shot
description: The moment library is a LanceDB table with one row per shot, its embedding stored next to its metadata.
owner: ledvincent
status: stable
tags: [decision]
---
# LanceDB, one row per shot

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/2026-10-12-mood-1-kickoff/`

## Context
Search filters on metadata (emotion, content, not rejected) and then ranks by embedding similarity. The library grows over time and gains columns ticket by ticket.

## Decision
LanceDB, embedded (no server), one row per shot with its SigLIP embedding in the same table, plus a Source table per ingested file. Schema changes go through `mood.library`, with a `pipeline_version` column so old rows can be re-processed. Schema: [/data/shot.md](/data/shot.md).

## Alternatives considered
- SQLite with FAISS: two stores to keep in sync.
- Chroma: weaker column filters.

## Consequences
- Filter-then-rank is one query.
- If footage source and licence must be recorded later (deferred question), they become new columns through a migration.
