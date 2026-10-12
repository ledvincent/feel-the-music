---
type: Integration
title: YouTube audio through yt-dlp
description: The song's audio is downloaded from YouTube with yt-dlp for beat and word analysis only, never exported.
owner: ledvincent
status: stable
tags: [integration, audio]
---
# YouTube audio through yt-dlp

## What we use it for
`mood audio` gets the song's audio to find the [beat grid](/domain/beat-grid.md) and the word timings. The audio is never in the exported reel and never committed. Decision: [/decisions/008-song-audio-from-youtube.md](/decisions/008-song-audio-from-youtube.md). Specs: `openspec/specs/reel-planning/spec.md`.

## How we connect
yt-dlp searches YouTube for "[song] [artist]", preferring official audio uploads, and downloads the audio only into `audio/` (git-ignored). No account and no credentials. A file given by the owner replaces the download.

**Duration check**: the audio's duration must be within 2 seconds of LRCLIB's. If not, the workflow stops and asks for another link or a file. With pasted lyrics, the owner confirms the duration against Instagram's.

**Terms of service**: downloading with yt-dlp goes against YouTube's terms. The owner accepted this in review; the audio is only analysed locally.

## Limits and failure
- YouTube changes break yt-dlp regularly: update it (`uv` dependency); `mood doctor` reports its version.
- Search can return a live version, a remix or a radio edit: the duration check catches most of them.

## Contacts
None (open-source tool).
