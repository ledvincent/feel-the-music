---
type: Decision
title: Song audio from YouTube with yt-dlp
description: The song's audio is downloaded with yt-dlp for analysis only, unless the owner gives a file, and checked by duration.
owner: ledvincent
status: stable
tags: [decision]
---
# Song audio from YouTube with yt-dlp

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/2026-10-12-mood-1-kickoff/`

## Context
Beats and word timings need the song's audio, but the reel is silent and the music is added in Instagram. Spotify's audio-analysis API is closed to new apps.

## Decision
Chosen by the owner in review, accepting that yt-dlp goes against YouTube's terms of service. `mood audio` searches YouTube for "[song] [artist]" (preferring official audio), downloads the audio only, and checks its duration against LRCLIB's: more than 2 s apart, it stops and asks. With pasted lyrics there is no LRCLIB duration, so the owner confirms the duration against Instagram's. A file from the owner replaces the download. The audio stays in `audio/` (git-ignored) and is never exported. Details: [/integrations/youtube-audio.md](/integrations/youtube-audio.md).

## Alternatives considered
- Owner-provided files only: no terms-of-service issue, one manual step per song.
- Spotify audio analysis: closed to new apps since late 2024.

## Consequences
- YouTube changes break yt-dlp regularly: keep it updated; `mood doctor` reports its version.
- Search can return a live version or a remix: the duration check catches most of them.
