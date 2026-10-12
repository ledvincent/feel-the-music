---
type: Glossary Term
title: Moment library
description: The searchable collection of analysed shots built from every video placed in the inbox, grown over time.
owner: ledvincent
status: stable
tags: [domain]
---
# Moment library

## Definition
All the [shots](/domain/shot.md) the system knows, with their embeddings, tags, captions and stats, stored in LanceDB, plus the exported keeper clips. Built once and added to whenever new footage arrives.

## Not to be confused with
- The inbox: video files waiting to be ingested.
- `processed/`: source files already ingested.

## Rules
- Input can be films, compilations, fan edits, stock footage and home movies.
- Junk shots are never stored.
- Target size: about 5 to 15 GB of keeper clips.

## Where it is used
Specs: `openspec/specs/footage-ingest/spec.md`, `openspec/specs/shot-search/spec.md`. Data: [/data/shot.md](/data/shot.md).
