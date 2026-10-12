---
type: Glossary Term
title: Beat grid
description: "The song's tempo, beat times and downbeat times, with word timings, all in song time: the clock every cut is placed on."
owner: ledvincent
status: stable
tags: [domain]
---
# Beat grid

## Definition
- **Beat**: one pulse of the music.
- **Downbeat**: the first beat of a bar (the "one" in one-two-three-four); the strongest beat.
- **Tempo**: beats per minute.
- **Word timings**: the start and end of every lyric word, from aligning the lyrics to our audio.
- **Song time**: seconds from the start of the recording, the same clock as Instagram's audio start. Every time in a reel plan is song time.

## Not to be confused with
- A phase of the [emotional arc](/domain/emotional-arc.md).
- LRC line times from LRCLIB: not used for cuts.

## Rules
Cut points ([/decisions/009-cuts-on-the-beat.md](/decisions/009-cuts-on-the-beat.md)):
1. the first beat after a lyric line ends;
2. the beat closest to the start of a line's meaningful word;
3. another beat, only for shot length or pace.
The first shot starts at the section start, wherever it falls.

## Where it is used
Specs: `openspec/specs/reel-planning/spec.md`, `openspec/specs/reel-render/spec.md`.
