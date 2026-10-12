---
type: Integration
title: LRCLIB
description: Free lyrics service that gives each song's lyrics text and the recording's duration.
owner: ledvincent
status: stable
tags: [integration, lyrics]
---
# LRCLIB

## What we use it for
`mood lyrics` gets the lyrics text and the recording's duration. The duration checks that our audio is the same recording ([/integrations/youtube-audio.md](/integrations/youtube-audio.md)). LRCLIB's line timings are not used for cuts: word timings come from alignment ([/domain/beat-grid.md](/domain/beat-grid.md)). Specs: `openspec/specs/reel-planning/spec.md`.

## How we connect
HTTPS to `lrclib.net`, search by track and artist. No account, no key, no credentials.

## Limits and failure
Song not found: the owner pastes the lyrics, and confirms the audio's duration by hand. Service down: same fallback.

## Contacts
Community-run service; no support contract.
