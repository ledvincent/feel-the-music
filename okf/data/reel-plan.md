---
type: Data Entity
title: Reel plan
description: "The plan.json for one reel: the contract between Claude's planning and the renderer, with every time in song time."
owner: ledvincent
status: stable
tags: [data, contract]
---
# Reel plan

Stored as `reels/<slug>/plan.json` (git-ignored). Written step by step during a reel request; read by `mood render`.

# Schema
| Field | Type | Meaning | Notes |
|---|---|---|---|
| song, artist | string | The song | |
| section.start, section.end | float | The [section](/domain/section.md) | song time, exact owner times |
| audio.path, audio.source | string | Analysed audio and where it came from | yt-dlp URL or owner file |
| beats.tempo, beats.times, beats.downbeats | float, list | The [beat grid](/domain/beat-grid.md) | song time |
| lyrics[].words[] (text, start, end) | list | Word timings | song time, from alignment |
| lyrics[].meaningful_word | int | Index of the line's meaningful word | chosen by Claude |
| phases[] (feeling, visual_direction, palette, start, end) | list | The [emotional arc](/domain/emotional-arc.md) | song time; change on downbeats |
| shots[] (shot_id, clip_in, clip_out, cut_at) | list | The sequence | `cut_at` in song time, a beat except the first |

## Relations
`shot_id` refers to [/data/shot.md](/data/shot.md).

## Lifecycle
Every time is song time: seconds from the start of the recording, the same clock as Instagram's audio start. The renderer converts to video time by subtracting `section.start`. One plan per reel; kept with the rendered reel.
