# Design

## Context

New project, no code yet. See `proposal.md` (Why) for the vision. The constraints that shape everything below come from FTM-1's "Decided" section:

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
inbox/ ──► ftm ingest ──────────────────────────────► library/ (LanceDB + keeper clips)
             split ─► cheap pass ─► junk filter ─► expensive pass ─► export keepers
                       (SigLIP)                    (small VLM)

Claude Code: "reel for [song] by [artist]"
   1. ftm lyrics   ──► LRCLIB (or pasted LRC)            ─► timed lyrics
   2. Claude       ──► section (20–30 s) + emotional arc  ─► reels/<slug>/plan.json
   3. ftm search   ──► candidates per beat (+ contact sheet)
      Claude       ──► final shot sequence                ─► plan.json updated
   4. ftm render plan.json ──► reels/<slug>/reel.mp4 + note.txt

ftm review ──► local page ──► rejected flag in library
```

### Modules (Python package `ftm`)

| Module | Job | Capability |
|--------|-----|-----------|
| `ftm.cli` | One command line `ftm` with sub-commands: `doctor`, `ingest`, `export`, `search`, `sheet`, `lyrics`, `render`, `review` | all |
| `ftm.config` | Folder paths (inbox, library, reels, models cache) and settings, from one `ftm.toml` | all |
| `ftm.ingest.split` | Shot boundaries per video | footage-ingest |
| `ftm.ingest.cheap` | SigLIP embeddings, zero-shot tags, measured stats, junk filter | footage-ingest |
| `ftm.ingest.describe` | Vision-language model pass on surviving shots | footage-ingest |
| `ftm.library` | LanceDB access: the shot table, its schema and migrations; keeper clip export | footage-ingest, shot-search, shot-review |
| `ftm.search` | Filters, ranking, consistency, candidate list, contact sheets | shot-search |
| `ftm.lyrics` | LRCLIB client and LRC parser | reel-planning |
| `ftm.render` | Reel plan → 9:16 video, grade, lyrics, note | reel-render |
| `ftm.review` | Local review page | shot-review |
| `.claude/skills/reel/` | The "reel for [song] by [artist]" workflow for Claude Code: calls the CLI and does the director step | reel-planning |

### Commands (no network API)

The system has no HTTP API. Its interface is the `ftm` CLI; each command prints JSON when `--json` is given, so Claude Code can read results. The only local web server is `ftm review` (bound to `127.0.0.1`).

### Connections

- **LRCLIB** (`lrclib.net`): free, no key; timed lyrics in LRC format. Only network call at run time.
- **Hugging Face Hub**: one-time model downloads into the models cache.
- **Instagram**: none. The owner posts by hand and adds the song from Instagram's audio library at the noted start time.

### Data model

- **Shot** (one LanceDB row): `shot_id`, `source_file`, `source_hash`, `start_s`, `end_s`, `duration_s`; cheap pass: `embedding` (SigLIP vector), `emotion_tags`, `content_tags`, `shot_type_tag`, `brightness`, `warmth`, `motion`, `junk_reason` (null when kept); expensive pass: `caption`, `emotion` (from the fixed list), `people_count`, `shot_type`, `setting`, `time_of_day`; lifecycle: `keeper`, `clip_path`, `rejected`, `rejected_at`; `ingested_at`, `pipeline_version`.
- **Source** (one row per ingested file): `source_hash`, `path`, `ingested_at`, `shot_count`. Lets ingest skip a file it already processed.
- **Reel plan** (`reels/<slug>/plan.json`): song, artist, section start and end in the song, timed lyric lines with their key word, beats (feeling, visual direction, palette, time range), and the chosen `shot_id`s with in/out points. It is the contract between Claude (planning) and the renderer.
- **Emotion list**: one fixed list in code, shared by zero-shot tagging, the VLM prompt and search filters (see D6).

### Environments

One: the owner's PC. Folders (configurable): `inbox/`, `library/` (LanceDB tables and `clips/`), `reels/`, `models/` (Hugging Face cache). None of them is committed; all are git-ignored. Tests run on CPU with tiny fixtures and fake models, so CI on GitHub needs no GPU.

## Decisions

### D1. Claude Code is the orchestrator and the director; Python tools do the heavy work — Decision record needed
The "reel for…" request is a Claude Code skill. Judgement steps (section choice, emotional arc, final shot pick) are done by Claude in the session, at no extra cost on the subscription. Deterministic and GPU steps are `ftm` CLI commands.
Alternatives: a local LLM for the director step (costs VRAM, weaker writing); the Claude API (paid, excluded by the brief).

### D2. Python 3.12 on Windows with PyTorch + CUDA, managed with uv — Decision record needed
Python 3.12 is the version most ML packages (PyTorch, transformers, LanceDB, decord/PyAV) ship Windows wheels for. `uv` pins Python and dependencies in `uv.lock` and installs the CUDA PyTorch build from its index. Tests: pytest. Lint and format: ruff.
Alternatives: 3.13/3.14 (installed, but wheels lag for some CUDA libraries); conda (heavier, slower to reproduce); WSL2 (adds a layer the owner would have to run).

### D3. One large model on the GPU at a time, pass by pass — Decision record needed
Ingest runs in passes over a batch of shots: split → cheap pass (SigLIP) → junk filter → expensive pass (VLM). Each pass loads its model, processes the whole batch, saves results, and frees GPU memory before the next. Passes are resumable: a pass skips shots that already have its columns.
Alternative: one model server holding all models (does not fit 8 GB).

### D4. LanceDB, one row per shot, embeddings in the same table — Decision record needed
Current choice in FTM-1. Embedded (no server), stores vectors next to metadata, supports filter-then-rank queries. Schema changes go through `ftm.library` with a `pipeline_version` column so old rows can be re-processed.
Alternatives: SQLite + FAISS (two stores to keep in sync); Chroma (weaker columnar filters).

### D5. SigLIP for look embeddings and zero-shot tags — Decision record needed
Current choice in FTM-1. One model gives both the look embedding and the zero-shot tags (emotion, content, shot type) by comparing a shot's frames with text prompts. Proposed checkpoint: `google/siglip-so400m-patch14-384` in fp16 (about 2 GB VRAM); the embedding of a shot is the mean of a few sampled frames. Search ranks with SigLIP text embeddings of the visual description, so the same model serves ingest and search.
Alternatives: CLIP ViT-L/14 (weaker on fine visual detail); SigLIP 2 (newer; can replace if a test set shows better results — embeddings would then be recomputed).

### D6. A fixed emotion list — Decision record needed
Proposed (to confirm in review): `heartbreak`, `longing`, `tenderness`, `intimacy`, `joy`, `euphoria`, `nostalgia`, `loneliness`, `melancholy`, `hope`, `calm`, `tension`. Defined once in code; tagging, the VLM prompt and search all use it. Changing the list later means re-tagging.

### D7. Shot splitting: TransNetV2 on the GPU (proposed, confirmed in backlog ticket 2) — Decision record needed
FTM-1 says splitting runs on the GPU and the tool is not chosen. TransNetV2 is a small neural cut detector (well under 1 GB VRAM) that handles fades and dissolves better than threshold methods. PySceneDetect `ContentDetector` is the fallback (CPU, simpler, fine for hard cuts).

### D8. Vision-language model: a small Qwen-VL model, quantised if needed (proposed, confirmed in backlog ticket 6) — Decision record needed
FTM-1 leaves it open. Requirements: fits under 8 GB alongside nothing else, follows a JSON output format, gives good short captions. Candidates to benchmark in ticket 6 on ~50 library shots: Qwen2.5-VL-3B-Instruct (fp16 or 8-bit), a 4-bit Qwen2.5-VL-7B, MiniCPM-V. Output is validated against the fixed emotion list (D6) and a JSON schema; invalid output is retried once, then the shot is marked for review.

### D9. Rendering: FFmpeg filter graphs with ASS subtitles for lyrics (proposed, confirmed in backlog ticket 10) — Decision record needed
FFmpeg (free, NVENC hardware encoding on the 3060 Ti) crops and scales each shot to 9:16, applies one shared grade (`lut3d` with a `.cube` LUT, plus `eq` for exposure), concatenates without audio, and burns lyrics from a generated ASS file (libass gives fonts, outlines, fades and per-word styling for the key-word emphasis).
Alternatives: MoviePy (slower, harder typographic control); Remotion (React-based, strong typography, but adds Node and a headless browser to the stack).

### D10. Keeper clips as the long-term library — Decision record needed
Keeper shots are exported as short H.264 clips (720p wide side, high quality) under `library/clips/`; reels render from clips, not from source films. This keeps the library at about 5–15 GB and lets source files be deleted after ingest.

### D11. Lyrics: LRCLIB first, pasted LRC as fallback
LRCLIB's search by track and artist returns synced LRC. If none is found or the owner pastes lyrics, the same LRC parser is used. Key words per line are chosen by Claude in the director step and stored in the reel plan.

### D12. Review page: local, served by `ftm review`
A small local page (FastAPI + plain HTML, bound to `127.0.0.1`) streams keeper clips with their caption and tags and a reject button. Rejection sets `rejected` on the shot row; search always filters `rejected = false`. Chosen in ticket 17; low cost to change.

## Risks / Trade-offs

- [VRAM: a 7B VLM may not fit with its vision encoder in 8 GB] → start with 3B or 4-bit; D3 keeps one model loaded; ticket 6 measures peak VRAM.
- [Zero-shot emotion tags are noisy] → tags only filter broadly; the VLM emotion and Claude's final read of captions decide; review rejections remove the worst.
- [Lyrics drift if the Instagram start time is not exact] → note the start to 0.1 s; open question 3 may make the section start snap to whole seconds.
- [Copyright takedowns from film footage] → open question 1; record source and licence per shot so risky shots can be filtered out later.
- [Windows wheels for CUDA libraries] → Python 3.12 and `uv`; `ftm doctor` checks the CUDA build, the GPU and FFmpeg before anything else.
- [Long ingest of full films] → resumable passes (D3); ingest can stop and resume.

## Migration Plan

None: new project. Library schema changes later go through `ftm.library` and `pipeline_version` (D4).

## Open Questions

See `proposal.md`, Open questions. The design-level ones (VLM, splitter, renderer checkpoints) are answered by benchmarks in their backlog tickets and do not change the specs.
