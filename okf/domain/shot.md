---
type: Glossary Term
title: Shot
description: One continuous take cut out of a source video, the unit the library stores, searches and puts in reels.
owner: ledvincent
status: stable
tags: [domain]
---
# Shot

## Definition
A stretch of a source video between two cuts. Variants:
- **Keeper**: a shot that survived junk removal, has its [expensive pass](/domain/expensive-pass.md), and has not been rejected by the owner. Only keepers are exported as clips.
- **Rejected shot**: a shot the owner rejected on the review page. Search never returns it again.
- **Junk shot**: credits, burned-in subtitles or black frames. Deleted during the [cheap pass](/domain/cheap-pass.md), never stored.

## Not to be confused with
- A scene in the film-making sense: several shots.
- A phase of the [emotional arc](/domain/emotional-arc.md): a stretch of the song, filled by one or more shots.

## Rules
- One row per shot ([/data/shot.md](/data/shot.md)).
- A shot is never frozen or looped to fill time: its usable length must cover the beats it fills.

## Where it is used
Specs: `openspec/specs/footage-ingest/spec.md`, `openspec/specs/shot-review/spec.md`.
