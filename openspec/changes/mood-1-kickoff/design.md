# Design

## Context

New project, no code yet. See `proposal.md` (Why) for the vision. The constraints that shape everything below come from MOOD-1's "Decided" section:

- Everything runs locally at $0. Claude Code runs on the owner's subscription; no paid API.
- One PC: Windows 11, RTX 3060 Ti with 8 GB VRAM, about 285 GB free on `C:`. Every model must fit in 8 GB, one large model loaded at a time.
- Export is silent; music is added in Instagram.
- Shots are chosen for the song's feeling, not its literal words.

No `okf/decisions/` or `okf/architecture/` files exist yet; phase 2 of this kickoff creates them from this document.

## Goals / Non-Goals

**Goals:**
- A small set of local command-line tools that do the heavy work (ingest, search, render), driven by Claude Code, which does the judgement (section, arc, final shot choice).
- A data model that lets each backlog ticket add one column or pass without rewriting the library.
- Each GPU step loads one model, processes a batch, and unloads it before the next.

**Non-Goals:**
- No server, no cloud, no account, no scheduler. The tools run when the owner asks.
- No real-time performance target; ingest can run overnight.
- No multi-user or remote access to the review page.

## Overview

```
inbox/ ──► mood ingest ──────────────────────────────► library/ (LanceDB + keeper clips)
             split ─► cheap pass ─► delete junk ─► expensive pass ─► export keepers ─► move source to processed/
                       (SigLIP)                    (small VLM)

Claude Code: "reel for [song] by [artist]"
   1. mood lyrics   ──► LRCLIB (or pasted lyrics)          ─► lyrics + recording duration
   2. mood audio    ──► yt-dlp (or owner's file), duration check ─► audio/<slug>.<ext> (local only)
   3. mood beats    ──► beat tracker                       ─► tempo, beats, downbeats
   4. mood align    ──► word aligner on the audio          ─► start and end of every word
   5. Owner         ──► section start and end times (exact; Claude suggests on request) ─► confirmed
      Claude        ──► emotional arc of phases + meaningful word per line ─► reels/<slug>/plan.json
   6. mood search   ──► candidates per phase (+ contact sheet)
      Claude + mood.timing ──► shot sequence, cuts on beats (after lines, on meaningful words) ─► plan.json
   7. mood render plan.json ──► reels/<slug>/reel.mp4 + note.txt

mood review ──► local page ──► rejected flag in library
```

### Modules (Python package `mood`)

| Module | Job | Capability |
|--------|-----|-----------|
| `mood.cli` | One command line `mood` with sub-commands: `doctor`, `ingest`, `export`, `search`, `sheet`, `lyrics`, `audio`, `beats`, `align`, `render`, `review` | all |
| `mood.config` | Folder paths (inbox, library, reels, models cache) and settings, from one `mood.toml` | all |
| `mood.ingest.split` | Shot boundaries per video | footage-ingest |
| `mood.ingest.cheap` | SigLIP embeddings, zero-shot tags, measured stats, junk filter | footage-ingest |
| `mood.ingest.describe` | Vision-language model pass on surviving shots | footage-ingest |
| `mood.library` | LanceDB access: the shot table, its schema and migrations; keeper clip export | footage-ingest, shot-search, shot-review |
| `mood.search` | Filters, ranking, consistency, candidate list, contact sheets | shot-search |
| `mood.lyrics` | LRCLIB client and LRC parser | reel-planning |
| `mood.audio` | Song audio (yt-dlp download or owner's file, duration check), beat grid (tempo, beats, downbeats) and word alignment | reel-planning |
| `mood.timing` | Cut planning: ranked cut points on beats (after a line, on a meaningful word, other beats), shot length per phase pace | reel-planning |
| `mood.render` | Reel plan → 9:16 video, grade, lyrics, note | reel-render |
| `mood.review` | Local review page | shot-review |
| `.claude/skills/reel/` | The "reel for [song] by [artist]" workflow for Claude Code: calls the CLI and does the director step | reel-planning |

### Commands (no network API)

The system has no HTTP API. Its interface is the `mood` CLI; each command prints JSON when `--json` is given, so Claude Code can read results. The only local web server is `mood review` (bound to `127.0.0.1`).

### Connections

- **LRCLIB** (`lrclib.net`): free, no key; the lyrics text and the recording's duration. Its line timings are not used for cuts (word alignment replaces them).
- **YouTube, through yt-dlp**: the song's audio, searched by song and artist, for beat analysis only. Never exported or committed.
- **Hugging Face Hub**: one-time model downloads into the models cache.
- **Instagram**: none. The owner posts by hand and adds the song from Instagram's audio library at the noted start time.

### Data model

- **Shot** (one LanceDB row): `shot_id`, `source_file`, `source_hash`, `start_s`, `end_s`, `duration_s`; cheap pass: `embedding` (SigLIP vector), `emotion_tags`, `content_tags`, `shot_type_tag`, `brightness`, `warmth`, `motion`; expensive pass: `caption`, `emotion` (from the fixed list), `people_count`, `shot_type`, `setting`, `time_of_day`; lifecycle: `keeper`, `clip_path`, `rejected`, `rejected_at`; junk shots (credits, burned-in subtitles, black frames) are deleted, never stored. A **keeper** is a shot that survived junk removal and has its expensive pass, and that the owner has not rejected; `ingested_at`, `pipeline_version`.
- **Source** (one row per ingested file): `source_hash`, `path`, `ingested_at`, `shot_count`. Lets ingest skip a file it already processed. Once ingested, a file moves from `inbox/` to `processed/` and `path` is updated, so keeper export can still read it; it can be deleted once its keepers are exported.
- **Reel plan** (`reels/<slug>/plan.json`): song, artist, section start and end in the song, lyric lines with the start and end of every word and the line's meaningful word, the audio file and its source, the beat grid (tempo, beat times, downbeat times), the phases of the arc (feeling, visual direction, palette, time range), and the chosen `shot_id`s with in/out points in the clip and cut times. **Every time in the plan is song time**: seconds from the start of the recording, the same clock as Instagram's audio start. The renderer converts to video time by subtracting the section start. It is the contract between Claude (planning) and the renderer.
- **Emotion list**: one fixed list in code, shared by zero-shot tagging, the VLM prompt and search filters (see D6).

### Environments

One: the owner's PC. Folders (configurable): `inbox/`, `processed/` (ingested source files), `library/` (LanceDB tables and `clips/`), `audio/` (song audio, analysis only), `reels/`, `models/` (Hugging Face cache). None of them is committed; all are git-ignored. Tests run on CPU with tiny fixtures and fake models, so CI on GitHub needs no GPU.

## Decisions

### D1. Claude Code is the orchestrator and the director; Python tools do the heavy work — Decision record needed
The "reel for…" request is a Claude Code skill. Judgement steps (emotional arc, final shot pick, and section suggestions when asked) are done by Claude in the session, at no extra cost on the subscription. Deterministic and GPU steps are `mood` CLI commands.
Alternatives: a local LLM for the director step (costs VRAM, weaker writing); the Claude API (paid, excluded by the brief).

### D2. Python 3.12 on Windows with PyTorch + CUDA, managed with uv — Decision record needed
Python 3.12 is the version most ML packages (PyTorch, transformers, LanceDB, decord/PyAV) ship Windows wheels for. `uv` pins Python and dependencies in `uv.lock` and installs the CUDA PyTorch build from its index. Tests: pytest. Lint and format: ruff.
Alternatives: 3.13/3.14 (installed, but wheels lag for some CUDA libraries); conda (heavier, slower to reproduce); WSL2 (adds a layer the owner would have to run).

### D3. One large model on the GPU at a time, pass by pass — Decision record needed
Ingest runs in passes over a batch of shots: split → cheap pass (SigLIP) → junk removal (deleted) → expensive pass (VLM). Each pass loads its model, processes the whole batch, saves results, and frees GPU memory before the next. Passes are resumable: a pass skips shots that already have its columns at the current `pipeline_version`; raising the version makes the next run redo older rows.
Alternative: one model server holding all models (does not fit 8 GB).

### D4. LanceDB, one row per shot, embeddings in the same table — Decision record needed
Current choice in MOOD-1. Embedded (no server), stores vectors next to metadata, supports filter-then-rank queries. Schema changes go through `mood.library` with a `pipeline_version` column so old rows can be re-processed.
Alternatives: SQLite + FAISS (two stores to keep in sync); Chroma (weaker columnar filters).

### D5. SigLIP for look embeddings and zero-shot tags — Decision record needed
Current choice in MOOD-1. One model gives both the look embedding and the zero-shot tags (emotion, content, shot type) by comparing a shot's frames with text prompts. Proposed checkpoint: `google/siglip-so400m-patch14-384` in fp16 (about 2 GB VRAM); the embedding of a shot is the mean of a few sampled frames. Search ranks with SigLIP text embeddings of the visual description, so the same model serves ingest and search.
Alternatives: CLIP ViT-L/14 (weaker on fine visual detail); SigLIP 2 (newer; can replace if a test set shows better results — embeddings would then be recomputed).

### D6. A fixed emotion list — Decision record needed
Proposed (to confirm in review): `heartbreak`, `longing`, `tenderness`, `intimacy`, `joy`, `euphoria`, `nostalgia`, `loneliness`, `melancholy`, `hope`, `calm`, `tension`. Defined once in code; tagging, the VLM prompt and search all use it. Changing the list later means re-tagging.

### D7. Shot splitting: TransNetV2 on the GPU (proposed, confirmed in backlog ticket 2) — Decision record needed
MOOD-1 says splitting runs on the GPU and the tool is not chosen. TransNetV2 is a small neural cut detector (well under 1 GB VRAM) that handles fades and dissolves better than threshold methods. PySceneDetect `ContentDetector` is the fallback (CPU, simpler, fine for hard cuts).

### D8. Vision-language model: a small Qwen-VL model, quantised if needed (proposed, confirmed in backlog ticket 6) — Decision record needed
MOOD-1 leaves it open. Requirements: fits under 8 GB alongside nothing else, follows a JSON output format, gives good short captions. Candidates to benchmark in ticket 6 on ~50 library shots: Qwen2.5-VL-3B-Instruct (fp16 or 8-bit), a 4-bit Qwen2.5-VL-7B, MiniCPM-V. Output is validated against the fixed emotion list (D6) and a JSON schema; invalid output is retried once, then the shot is marked for review.

### D9. Rendering: FFmpeg filter graphs with ASS subtitles for lyrics (proposed, confirmed in backlog ticket 10) — Decision record needed
FFmpeg (free, NVENC hardware encoding on the 3060 Ti) crops and scales each shot to 9:16, applies one shared grade (`lut3d` with a `.cube` LUT, plus `eq` for exposure), concatenates without audio, and burns lyrics from a generated ASS file (libass gives fonts, outlines, fades and per-word styling for the key-word emphasis).
Alternatives: MoviePy (slower, harder typographic control); Remotion (React-based, strong typography, but adds Node and a headless browser to the stack).

### D10. Keeper clips as the long-term library — Decision record needed
Keeper shots are exported as short H.264 clips (720p wide side, high quality) under `library/clips/`; reels render from clips, not from source films. This keeps the library at about 5–15 GB and lets source files be deleted after ingest.

### D11. Lyrics: LRCLIB for the text and duration, pasted lyrics as fallback
LRCLIB's search by track and artist gives the lyrics and the recording's duration. If the song is not found, the owner pastes the lyrics. Timing comes from word alignment (D16), not from LRC line timestamps. The meaningful word of each line is chosen by Claude in the director step and stored in the reel plan; the renderer emphasises it and the cut planner may cut on it.

### D12. Review page: local, served by `mood review`
A small local page (FastAPI + plain HTML, bound to `127.0.0.1`) streams keeper clips with their caption and tags and a reject button. Rejection sets `rejected` on the shot row; search always filters `rejected = false`. Chosen in ticket 17; low cost to change.

### D13. Song audio from YouTube with yt-dlp, owner's file as override — Decision record needed
Chosen by the owner in review. `mood audio` searches YouTube for "[song] [artist]" (preferring official audio uploads), downloads the audio only, and checks its duration against LRCLIB's (more than 2 s apart: stop and ask; with pasted lyrics there is no LRCLIB duration, so the owner confirms the audio's duration against Instagram's). An audio file given by the owner skips the download. Audio is used only for beats and word timings; it stays in `audio/` (git-ignored) and is never in the export.
Alternatives: owner-provided files only (no terms-of-service issue, one manual step per song); Spotify's audio-analysis API (closed to new apps since late 2024).

### D14. Beat tracking: Beat This! (proposed, confirmed in backlog ticket 15) — Decision record needed
A recent PyTorch beat and downbeat tracker that handles pop and indie songs well, runs on CPU or GPU, and gives downbeats directly. librosa's beat tracker is the fallback (simpler, beats only, downbeats estimated from the bar length). madmom is avoided: its Windows build is painful. Benchmarked in ticket 15 on a few songs tapped by hand.

### D15. Cuts on beats, placed by the lyrics — Decision record needed
Decided with the owner in review. The first shot starts at the section start (the owner's exact time, even between beats); every later cut is a beat time. Cut points are ranked: (1) the first beat after a lyric line ends, (2) the beat closest to the start of the line's meaningful word, (3) any other beat, only when needed to keep a shot within its usable length or the phase's pace. Phase changes fall on downbeats. Calm phases hold shots for more beats than intense ones. The renderer cuts at those times to the nearest frame (33 ms at 30 fps, under what the eye notices). Indie love songs nearly always have a steady beat; when the beat in the section is irregular, the owner is warned instead of the plan silently changing rules.

### D16. Word alignment on the song audio (proposed, confirmed in backlog ticket 16) — Decision record needed
Cutting on a meaningful word needs word timings, and LRC only times lines (often from a different upload). A local aligner matches the lyric text to our audio and gives the start and end of every word: WhisperX (wav2vec2 alignment, a few GB of VRAM, loaded alone per D3) or stable-ts (Whisper-based, simpler install). Chosen on a few songs checked by ear. It also removes any offset between LRCLIB and the recording.
Alternative: cut on lyric lines (the original plan), which lags visibly behind the music because sung lines rarely start on the beat.

## Risks / Trade-offs

- [VRAM: a 7B VLM may not fit with its vision encoder in 8 GB] → start with 3B or 4-bit; D3 keeps one model loaded; ticket 6 measures peak VRAM.
- [Zero-shot emotion tags are noisy] → tags only filter broadly; the VLM emotion and Claude's final read of captions decide; review rejections remove the worst.
- [Lyrics drift if the Instagram start time is not set exactly] → the note gives the start to 0.1 s; the owner can give section times in whole seconds if Instagram's slider is coarse; the renderer never moves the owner's times.
- [Copyright takedowns from film footage] → open question 1; record source and licence per shot so risky shots can be filtered out later.
- [Windows wheels for CUDA libraries] → Python 3.12 and `uv`; `mood doctor` checks the CUDA build, the GPU and FFmpeg before anything else.
- [yt-dlp breaks when YouTube changes, or finds the wrong version] → keep yt-dlp updated (`mood doctor` reports its version); the duration check (D13) catches most wrong versions; the owner's file is always an option.
- [Our audio is not the recording Instagram plays] → duration check (D13); word alignment (D16) on our audio keeps lyrics, beats and cuts on one clock; preview the first reels in Instagram's editor.
- [Beat tracker wrong on rubato or half-time songs] → benchmark in ticket 15; the workflow shows the tempo and warns when the beat is irregular.
- [Long ingest of full films] → resumable passes (D3); ingest can stop and resume.

## Migration Plan

None: new project. Library schema changes later go through `mood.library` and `pipeline_version` (D4).

## Open Questions

See `proposal.md`, Open questions. The design-level ones (VLM, splitter, renderer checkpoints) are answered by benchmarks in their backlog tickets and do not change the specs.
