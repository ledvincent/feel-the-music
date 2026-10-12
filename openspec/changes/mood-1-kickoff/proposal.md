Jira: MOOD-1
Size: big

# Proposal

## Why

An Instagram page shares indie love songs chosen by the owner, each turned into a cinematic 20–30 second reel: a compilation of short, touching shots that match the song's feeling (not its literal words), with the lyrics displayed in a stylish way, and no manual editing. Finding the right scenes is the hard part, so the system builds and grows its own searchable library of shots. This kickoff plans the whole system before any code is written: the feature areas, the architecture and key decisions, and a backlog of one-PR tickets.

## What Changes

In scope (behaviour planned now, built by the backlog tickets):

- A **moment library**: video files dropped into `inbox/` are split into shots on the GPU, analysed in a cheap pass (every shot) and an expensive pass (surviving shots only; credits, subtitles and black frames are deleted), and stored as one row per shot. Keeper shots can be exported as small clips.
- A **shot search** that filters on emotion and content, ranks by visual feel, keeps the sequence visually consistent, and produces contact sheets to check search quality.
- A **reel renderer** that outputs a silent 9:16 video with one shared colour grade, styled lyrics with the meaningful word of each line emphasised, and a note giving the song start time.
- A **per-song workflow** started in Claude Code with "reel for [song] by [artist]": the lyrics, the song's audio (downloaded with yt-dlp, used only for analysis), its beat grid and word timings, the 20–30 second section **set by the owner with exact start and end times** (Claude can suggest, never chooses), an emotional arc of phases, and shot selection with **every cut on a beat**, placed by the lyrics: first the beat after a line ends, then the beat at a line's meaningful word. Scene changes never lag behind the music. Every time is song time, the same clock as Instagram's audio start.
- A **review page** to reject bad shots so results improve over time.
- Project foundation (phase 2 of this ticket): `okf/` seeded with the architecture, key decisions and main terms; `CLAUDE.md` filled in; first specs archived into `openspec/specs/`.

Out of scope:

- Writing code (this ticket produces specs and knowledge only).
- Posting to Instagram automatically.
- Audio in the export (music is added in Instagram).
- Any paid API or cloud service; everything runs locally at $0.

## Capabilities

### New Capabilities

- `footage-ingest`: turning video files in `inbox/` into analysed, stored shots in the moment library (splitting, cheap pass, expensive pass, junk removal, keeper clip export).
- `shot-search`: finding and ranking shots in the moment library for one phase of the arc (filters, visual-feel ranking, consistency, contact sheets).
- `reel-planning`: the per-song workflow from a song request to a chosen shot sequence (lyrics, song audio, beat grid, word timings, owner-set section, emotional arc, shot selection with cuts on the beat).
- `reel-render`: producing the final silent 9:16 reel from a planned sequence (framing, frame-accurate cuts, shared grade, styled lyrics, start-time note).
- `shot-review`: reviewing shots and rejecting bad ones so they stop being used.

### Modified Capabilities

None (new project).

## Impact

- New Python 3.12 project run locally on Windows with an RTX 3060 Ti (8 GB VRAM); see `design.md`.
- New local dependencies: PyTorch with CUDA, SigLIP, a small vision-language model, a shot-splitting tool, a beat tracker, a word aligner, LanceDB, FFmpeg, yt-dlp. Models are downloaded once.
- Two external services: LRCLIB (free, no key) for the lyrics and the recording's duration; YouTube, through yt-dlp, for the song's audio (analysis only, never exported).
- Disk: a library of about 5–15 GB of keeper clips plus the source videos while they are processed.

## Not in Jira yet

These scenarios are not stated in MOOD-1; the ticket owner adds them to Jira (or drops them) before approving:

- `footage-ingest` / **Same file twice**: a video already ingested is not ingested again.
- `footage-ingest` / **Processed file leaves inbox**: an ingested video is moved to `processed/` so the inbox shows only what is left to do.
- `footage-ingest` / **Not a keeper**: shots without an expensive pass, or rejected, are not exported.
- `footage-ingest` / **Keeper exported**: a reel can use an exported keeper clip without the source video (so source videos can be deleted).
- `reel-planning` / **No repeated shot**: no shot appears twice in the same reel.
- `shot-search` / **No match**: a search with no matching shot says so instead of returning unrelated shots.
- `reel-planning` / **Lyrics not found**: when LRCLIB does not have the song, the workflow asks for the lyrics to be pasted.
- `shot-review` / **Rejected shot never returned**: a rejected shot is never returned by search again.

MOOD-1's description was updated on 2026-10-12 with the review decisions (owner-set section, song audio with yt-dlp, beats and word timings, cuts on the beat, junk shots deleted, keepers, `processed/`), so those scenarios are covered by the ticket.

## Open questions

For the reviewers (Tech lead, Architect, PM) to answer on the PR:

1. **Footage sourcing** (from the ticket): deferred by the owner, to be discussed before films are ingested at scale. It does not block this plan: if each shot must later record its source and licence, the Source table gains those columns through a `pipeline_version` migration (D4).
2. **Originality** (from the ticket): answered in review. Compilations and fan edits are accepted in `inbox/`, like raw footage; originality comes from the sequencing, the song choice and the lyrics, not from the footage alone.
3. **Sync** (from the ticket): burned-in lyrics only line up if the Instagram audio starts at the exact noted time. The owner's times are used exactly and never moved. How precise is Instagram's start slider? If it is coarse, the owner gives section times in whole seconds. Check by previewing the first reels in Instagram's editor.
4. **Emotion list**: the fixed list of emotions shared by tagging, captions and search. Proposed in `design.md` (D6); confirm or edit.
5. **Tool choices not made yet**: the vision-language model, the shot-splitting tool, the rendering tool, the beat tracker and the word aligner. Recommendations are in `design.md` (D7–D9, D14, D16); each is confirmed in its backlog ticket.
6. **Audio download**: answered in review. The owner accepts yt-dlp (D13), knowing it goes against YouTube's terms of service; the audio is only analysed locally and never published. An audio file from the owner always replaces the download.
7. **Lyrics and audio from different recordings**: answered in review. LRCLIB gives only the text and duration; word timings come from aligning the lyrics to our audio (D16), so lyrics, beats and cuts share one clock.
8. **Machine**: answered in review. Moodcut runs on a separate PC with the RTX 3060 Ti; its NVIDIA driver (which provides `nvidia-smi`) and FFmpeg are checked by `mood doctor` in ticket 1. The laptop used for planning (Intel Arc, no CUDA) is only for writing code; tests run on CPU.

## Backlog

One row per proposed Jira ticket, each one PR, in build-plan order. Sizes follow `CLAUDE.md`.

| # | Title | Size | Depends on | Capability |
|---|-------|------|-----------|------------|
| 1 | Project skeleton: Python 3.12 package, `mood` CLI, config of folders, test and lint, `mood doctor` checking GPU, VRAM and FFmpeg | normal | — | — (tooling) |
| 2 | Shot splitting: ingest videos from `inbox/`, split into shots on the GPU, store one row per shot in LanceDB | big | 1 | footage-ingest |
| 3 | Cheap pass: SigLIP embeddings and measured brightness, warmth and motion for every shot | normal | 2 | footage-ingest |
| 4 | Junk removal: drop credits, subtitles and black frames | normal | 3 | footage-ingest |
| 5 | Zero-shot tags: emotion, content and shot type for every shot | normal | 3 | footage-ingest |
| 6 | Expensive pass: choose the vision-language model, write caption, emotion, people count, shot type, setting, time of day for surviving shots | big | 4, 5 | footage-ingest |
| 7 | Keeper clip export: export keeper shots as small clips, move sources to `processed/`, report library size | normal | 6 | footage-ingest |
| 8 | Search command: emotion/content filters, visual-feel ranking, stats consistency, top candidates with captions | normal | 5, 6 | shot-search |
| 9 | Contact sheets for a search, to check search quality | normal | 8 | shot-search |
| 10 | Renderer base: choose the rendering tool, render a reel plan to a silent 9:16 video with frame-accurate cuts and the start-time note | big | 1, 7 | reel-render |
| 11 | Shared colour grade across all shots of a reel | normal | 10 | reel-render |
| 12 | Lyric styles with emphasis on the meaningful word of each line | normal | 10 | reel-render |
| 13 | Lyrics: LRCLIB lookup (text and recording duration) and paste fallback | big | 1 | reel-planning |
| 14 | Song audio: yt-dlp download from song and artist, owner-given file instead, duration check | big | 13 | reel-planning |
| 15 | Beat grid: choose the beat tracker, detect tempo, beats and downbeats, warn on an irregular beat | normal | 14 | reel-planning |
| 16 | Word timings: choose the aligner, align the lyrics to the audio, start and end of every word | normal | 14 | reel-planning |
| 17 | Section: owner gives exact start and end times, Claude suggests on request, owner confirms | normal | 13, 15 | reel-planning |
| 18 | Director step: emotional arc of phases (feeling, visual direction, palette) changing on downbeats, meaningful word per line | normal | 16, 17 | reel-planning |
| 19 | Shot selection with cuts on beats (after a line, on a meaningful word, pace by phase), and the "reel for [song] by [artist]" command end to end | normal | 8, 11, 12, 18 | reel-planning |
| 20 | Review page: browse shots and reject bad ones | big | 7 | shot-review |
| 21 | Rejections improve results: rejected shots excluded from search | normal | 8, 20 | shot-review |
