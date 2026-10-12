---
type: Architecture
title: Architecture overview
description: Local Python CLI tools (mood) do ingest, search and rendering on one GPU PC; Claude Code drives them and does the creative judgement.
owner: ledvincent
status: stable
tags: [architecture]
---
# Architecture overview

## Overview
Moodcut turns indie love songs into silent, cinematic 9:16 reels for Instagram. A local Python package, `mood`, does the heavy and deterministic work (ingest footage, search shots, analyse the song, render). Claude Code drives it from a skill and does the judgement: the emotional arc, the meaningful word of each line, the final shot choice. The owner sets the section of the song. Everything runs on one PC at $0. See [/decisions/001-claude-code-orchestrates-local-tools.md](/decisions/001-claude-code-orchestrates-local-tools.md).

## Modules
| Module | Folder | Does |
|---|---|---|
| `mood.cli` | `src/mood/cli.py` | The `mood` command: `doctor`, `ingest`, `export`, `search`, `sheet`, `lyrics`, `audio`, `beats`, `align`, `render`, `review`; `--json` output for Claude |
| `mood.config` | `src/mood/config.py` | Folder paths and settings from `mood.toml` |
| `mood.ingest.split` | `src/mood/ingest/` | Shot boundaries per video |
| `mood.ingest.cheap` | `src/mood/ingest/` | SigLIP embeddings, zero-shot tags, measured stats, junk deletion |
| `mood.ingest.describe` | `src/mood/ingest/` | Vision-language model pass on surviving shots |
| `mood.library` | `src/mood/library/` | LanceDB tables, schema and migrations, keeper clip export |
| `mood.search` | `src/mood/search/` | Filters, ranking, consistency, candidates, contact sheets |
| `mood.lyrics` | `src/mood/lyrics.py` | LRCLIB client and lyrics parsing |
| `mood.audio` | `src/mood/audio/` | Song audio (yt-dlp or the owner's file), beat grid, word alignment |
| `mood.timing` | `src/mood/timing.py` | Cut planning on beats |
| `mood.render` | `src/mood/render/` | Reel plan to 9:16 video, grade, lyrics, start-time note |
| `mood.review` | `src/mood/review/` | Local review page |
| reel skill | `.claude/skills/reel/` | The "reel for [song] by [artist]" workflow in Claude Code |

Folders are the planned layout; the project-skeleton ticket (backlog 1) creates them.

## Data flow
**Ingest** (`mood ingest`, can run overnight): `inbox/` → split into [shots](/domain/shot.md) → [cheap pass](/domain/cheap-pass.md) → junk deleted → [expensive pass](/domain/expensive-pass.md) → keepers exported as clips → source moved to `processed/`. One GPU model at a time ([/decisions/003-one-gpu-model-at-a-time.md](/decisions/003-one-gpu-model-at-a-time.md)).

**A reel** ("reel for [song] by [artist]"):
1. `mood lyrics`: lyrics and recording duration from [LRCLIB](/integrations/lrclib.md), or pasted.
2. `mood audio`: the song's audio ([YouTube via yt-dlp](/integrations/youtube-audio.md) or the owner's file), checked by duration.
3. `mood beats` and `mood align`: the [beat grid](/domain/beat-grid.md) and word timings.
4. The owner sets the [section](/domain/section.md); Claude writes the [emotional arc](/domain/emotional-arc.md).
5. `mood search` per phase (with [contact sheets](/domain/contact-sheet.md)); Claude and `mood.timing` pick the shots and place cuts on beats ([/decisions/009-cuts-on-the-beat.md](/decisions/009-cuts-on-the-beat.md)).
6. `mood render` turns the [reel plan](/data/reel-plan.md) into `reels/<slug>/reel.mp4` and the [start-time note](/domain/start-time-note.md).

**Review** (`mood review`): a local page where the owner rejects bad shots.

## External services
- [LRCLIB](/integrations/lrclib.md): lyrics text and recording duration.
- [YouTube through yt-dlp](/integrations/youtube-audio.md): song audio, analysis only.
- Hugging Face Hub: one-time model downloads into `models/`.
- Instagram: none; the owner posts by hand.

## Deployment
None: one environment, the owner's PC with the RTX 3060 Ti (Windows 11). Working folders, all git-ignored: `inbox/`, `processed/`, `library/` (LanceDB and `clips/`), `audio/`, `reels/`, `models/`. Tests run on CPU with tiny fixtures and fake models, so CI on GitHub needs no GPU. Stack: [/architecture/tech-stack.md](/architecture/tech-stack.md).

## Decisions
[001](/decisions/001-claude-code-orchestrates-local-tools.md) · [002](/decisions/002-python-312-uv-windows-cuda.md) · [003](/decisions/003-one-gpu-model-at-a-time.md) · [004](/decisions/004-lancedb-one-row-per-shot.md) · [005](/decisions/005-siglip-embeddings-and-tags.md) · [006](/decisions/006-fixed-emotion-list.md) · [007](/decisions/007-keeper-clips-as-library.md) · [008](/decisions/008-song-audio-from-youtube.md) · [009](/decisions/009-cuts-on-the-beat.md)
