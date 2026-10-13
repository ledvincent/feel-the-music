---
type: Decision
title: Keeper clips as the long-term library
description: Keeper shots are exported as small clips and reels render from them, so source films can be deleted.
owner: ledvincent
status: stable
tags: [decision]
---
# Keeper clips as the long-term library

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/mood-1-kickoff-2026-10-12/`

## Context
Source films are large; the library must stay around 5 to 15 GB on the owner's disk.

## Decision
Every [keeper](/domain/shot.md) is exported as a short H.264 clip (720p on the wide side, high quality) under `library/clips/`. Reels render from clips, never from source files. After ingest, sources move to `processed/` and can be deleted once their keepers are exported.

## Alternatives considered
- Keep the source films and cut from them at render time: hundreds of GB.

## Consequences
- A shot rejected after export keeps its clip on disk until cleaned, but search never returns it.
- Re-cutting a shot with different in and out points beyond its clip needs the source again.
