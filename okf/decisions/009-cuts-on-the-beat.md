---
type: Decision
title: Cuts on beats, placed by the lyrics
description: Every cut after the first shot lands on a beat, preferably the beat after a lyric line ends or the beat at a line's meaningful word.
owner: ledvincent
status: stable
tags: [decision]
---
# Cuts on beats, placed by the lyrics

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/2026-10-12-mood-1-kickoff/`

## Context
Cutting on lyric lines lags visibly behind the music, because sung lines rarely start on the beat. The owner also sets the section, and its times must not move.

## Decision
The first shot starts at the section start, the owner's exact time, even between beats. Every later cut is a beat time. Cut points, in order of preference: (1) the first beat after a lyric line ends; (2) the beat closest to the start of the line's meaningful word; (3) another beat, only to keep a shot within its usable length or the phase's pace. Phases change on downbeats. Calm phases hold shots for more beats than intense ones. The renderer cuts to the nearest frame. When the section's beat is irregular, the owner is warned. Terms: [/domain/beat-grid.md](/domain/beat-grid.md).

## Alternatives considered
- Cut on lyric line starts (the original plan): lags behind the music.
- Snap the section start to a downbeat: rejected by the owner; the owner's times are exact.

## Consequences
- Needs word timings from alignment on our audio, not LRC line times.
- All plan times are song time, so lyrics, beats and cuts share one clock.
