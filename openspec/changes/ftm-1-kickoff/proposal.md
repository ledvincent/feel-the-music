Jira: FTM-1
Size: big

# Proposal

## Why

An Instagram page shares indie love songs chosen by the owner, each turned into a cinematic 20–30 second reel: a compilation of short, touching shots that match the song's feeling (not its literal words), with the lyrics displayed in a stylish way, and no manual editing. Finding the right scenes is the hard part, so the system builds and grows its own searchable library of shots. This kickoff plans the whole system before any code is written: the feature areas, the architecture and key decisions, and a backlog of one-PR tickets.

## What Changes

In scope (behaviour planned now, built by the backlog tickets):

- A **moment library**: video files dropped into `inbox/` are split into shots on the GPU, analysed in a cheap pass (every shot) and an expensive pass (surviving shots only), and stored as one row per shot. Keeper shots can be exported as small clips.
- A **shot search** that filters on emotion and content, ranks by visual feel, keeps the sequence visually consistent, and produces contact sheets to check search quality.
- A **reel renderer** that outputs a silent 9:16 video with one shared colour grade, styled lyrics with the key word of each line emphasised, and a note giving the song start time.
- A **per-song workflow** started in Claude Code with "reel for [song] by [artist]": timed lyrics, choice of the strongest 20–30 seconds, an emotional arc of beats, and shot selection.
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
- `shot-search`: finding and ranking shots in the moment library for a beat (filters, visual-feel ranking, consistency, contact sheets).
- `reel-planning`: the per-song workflow from a song request to a chosen shot sequence (timed lyrics, section choice, emotional arc, shot selection).
- `reel-render`: producing the final silent 9:16 reel from a planned sequence (framing, shared grade, styled lyrics, start-time note).
- `shot-review`: reviewing shots and rejecting bad ones so they stop being used.

### Modified Capabilities

None (new project).

## Impact

- New Python 3.12 project run locally on Windows with an RTX 3060 Ti (8 GB VRAM); see `design.md`.
- New local dependencies: PyTorch with CUDA, SigLIP, a small vision-language model, a shot-splitting tool, LanceDB, FFmpeg. Models are downloaded once.
- One external service: LRCLIB (free, no key) for timed lyrics.
- Disk: a library of about 5–15 GB of keeper clips plus the source videos while they are processed.

## Not in Jira yet

These scenarios are not stated in FTM-1; the ticket owner adds them to Jira (or drops them) before approving:

- `footage-ingest` / **Same file twice**: a video already ingested is not ingested again.
- `footage-ingest` / **Processed file leaves inbox**: an ingested video is moved out of `inbox/` so the inbox shows only what is left to do.
- `footage-ingest` / **Keeper exported**: a reel can use an exported keeper clip without the source video (so source videos can be deleted).
- `reel-planning` / **No repeated shot**: no shot appears twice in the same reel.
- `shot-search` / **No match**: a search with no matching shot says so instead of returning unrelated shots.
- `reel-planning` / **Lyrics not found**: when LRCLIB has no timed lyrics, the workflow asks for them to be pasted.
- `shot-review` / **Rejected shot never returned**: a rejected shot is never returned by search again.

## Open questions

For the reviewers (Tech lead, Architect, PM) to answer on the PR:

1. **Footage sourcing** (from the ticket): public-domain and stock footage carry no risk; recent films carry takedown risk as the page grows. Which sources are allowed in `inbox/`? Should each shot record its source and licence so risky shots can be filtered out later?
2. **Originality** (from the ticket): reposting other people's edits limits reach. Should compilations or fan edits be accepted in `inbox/` at all, or only raw footage?
3. **Sync** (from the ticket): burned-in lyrics only line up if the Instagram audio starts at the exact noted time. How precise is Instagram's start picker (whole seconds?). If it is coarse, the renderer can snap the section start to a whole second.
4. **Emotion list**: the fixed list of emotions shared by tagging, captions and search. Proposed in `design.md` (D6); confirm or edit.
5. **Tool choices not made yet**: the vision-language model, the shot-splitting tool and the rendering tool. Recommendations are in `design.md` (D7–D9); each is confirmed in its backlog ticket.
6. **Machine**: `nvidia-smi` and `ffmpeg` were not found on the PATH of this PC. Confirm the NVIDIA driver is installed; FFmpeg is installed by the first backlog ticket.

## Backlog

One row per proposed Jira ticket, each one PR, in build-plan order. Sizes follow `CLAUDE.md`.

| # | Title | Size | Depends on | Capability |
|---|-------|------|-----------|------------|
| 1 | Project skeleton: Python 3.12 package, `ftm` CLI, config of folders, test and lint, `ftm doctor` checking GPU, VRAM and FFmpeg | normal | — | — (tooling) |
| 2 | Shot splitting: ingest videos from `inbox/`, split into shots on the GPU, store one row per shot in LanceDB | big | 1 | footage-ingest |
| 3 | Cheap pass: SigLIP embeddings and measured brightness, warmth and motion for every shot | normal | 2 | footage-ingest |
| 4 | Junk removal: drop credits, subtitles and black frames | normal | 3 | footage-ingest |
| 5 | Zero-shot tags: emotion, content and shot type for every shot | normal | 3 | footage-ingest |
| 6 | Expensive pass: choose the vision-language model, write caption, emotion, people count, shot type, setting, time of day for surviving shots | big | 4, 5 | footage-ingest |
| 7 | Keeper clip export: export kept shots as small clips and report library size | normal | 2 | footage-ingest |
| 8 | Search command: emotion/content filters, visual-feel ranking, stats consistency, top candidates with captions | normal | 5, 6 | shot-search |
| 9 | Contact sheets for a search, to check search quality | normal | 8 | shot-search |
| 10 | Renderer base: choose the rendering tool, render a reel plan to a silent 9:16 video with the start-time note | big | 1, 7 | reel-render |
| 11 | Shared colour grade across all shots of a reel | normal | 10 | reel-render |
| 12 | Lyric styles with emphasis on the key word of each line | normal | 10 | reel-render |
| 13 | Timed lyrics: LRCLIB lookup with paste fallback | big | 1 | reel-planning |
| 14 | Section choice: pick the strongest 20–30 seconds | normal | 13 | reel-planning |
| 15 | Director step: emotional arc of beats (feeling, visual direction, palette) | normal | 14 | reel-planning |
| 16 | Shot selection and the "reel for [song] by [artist]" command end to end | normal | 8, 11, 12, 15 | reel-planning |
| 17 | Review page: browse shots and reject bad ones | big | 7 | shot-review |
| 18 | Rejections improve results: rejected shots excluded from search | normal | 8, 17 | shot-review |
