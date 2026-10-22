Jira: MOOD-3
Size: big
QC: none
Difficulty: tricky
Tier: heavy

# Proposal

## Why

The moment library is empty: nothing turns the videos the owner drops in `inbox/` into shots. Every later ingest pass (cheap pass MOOD-4, junk removal, tags, expensive pass, keeper export) works on Shot rows, so the split pass and the Shot and Source tables come first. This is backlog row 2 of the MOOD-1 kickoff; it depends on MOOD-2 (the `mood` CLI and config) and blocks MOOD-4.

## What Changes

- New command `mood ingest` (with `--json`): takes every file in `inbox/` and its subfolders, at any depth, with a video extension (`.mp4 .mkv .mov .avi .webm .m4v`, any case), splits each into shots and stores them. Other files are left alone and listed as ignored. A missing `inbox/` folder stops ingest with the path and how to fix it, and a non-zero exit.
- New module `mood.library`: the LanceDB Shot and Source tables under `library/`, with only the columns this ticket fills (Shot: `shot_id`, `source_file`, `source_hash`, `start_s`, `end_s`, `duration_s`, `ingested_at`, `pipeline_version`; Source: `source_hash`, `path`, `ingested_at`, `shot_count`, `splitter`), plus the migration hook later tickets use to add their columns (`okf/decisions/004-lancedb-one-row-per-shot.md`).
- New module `mood.ingest.split`: the split pass. TransNetV2 is the splitter (GPU, also runs on CPU; weights downloaded once from Hugging Face into `models/`). When TransNetV2 cannot be loaded, PySceneDetect splits instead, the report warns, and each Source row records the splitter that ran.
- A file whose content hash is already in the Source table (same file or renamed copy) is skipped.
- Shots shorter than 1 s are not stored; the report counts them. A video with no cuts is one shot.
- A file that cannot be read as a video, or that the splitter fails on, is reported with the reason, gets no rows, and stays in `inbox/`; the other files are still ingested with the same splitter, and `mood ingest` exits non-zero at the end.
- A file is either fully stored or has no rows: an interrupted run leaves nothing half-written for it, and the next run ingests it.
- The splitter model is loaded once for the batch and freed before anything else is loaded (`okf/decisions/003-one-gpu-model-at-a-time.md`).

## Out of scope

- Cheap pass and embeddings (MOOD-4), junk removal, zero-shot tags, expensive pass: later backlog tickets; they add their columns through `mood.library` migrations.
- Keeper clip export and moving sources to `processed/` (backlog row 7). After this ticket an ingested file stays in `inbox/`; the hash skip keeps it from being ingested twice. The existing scenario "Processed file leaves inbox" is kept unchanged for that ticket.
- A progress display, a performance target, footage source or licence columns.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `footage-ingest`: "Ingest videos from the inbox" (video extensions, `mood ingest`), "Split videos into shots" (source hash, duration, video without cuts) and "Fit the GPU" (splitter freed after the split pass) are modified; added requirements cover the Source record, the hash skip, short shots, unreadable and ignored files, the splitter fallback, resumability and the ingest report.

## Impact

- New code: `src/mood/library/`, `src/mood/ingest/`, the `ingest` command in `src/mood/cli.py`, tests under `tests/`.
- New dependencies: `lancedb` and `pyarrow` (pinned in `uv.lock`, as the tech stack says), `av` (PyAV, allowed for reading frames), `scenedetect` with `opencv-python-headless` (fallback splitter), `huggingface_hub` (one-time weights download). No paid service.
- New data on disk: LanceDB tables in `library/`, TransNetV2 weights in `models/` (both git-ignored).
- Knowledge: `okf/data/shot.md`, `okf/domain/shot.md`, `okf/decisions/003-one-gpu-model-at-a-time.md`, `okf/decisions/004-lancedb-one-row-per-shot.md`, `okf/decisions/007-keeper-clips-as-library.md`, `okf/architecture/overview.md`, `okf/architecture/tech-stack.md`. At close-change: a new decision `okf/decisions/010-...` for the splitter choice, `okf/data/shot.md` gains the Source `splitter` column and the id and hash rules, and the tech stack moves TransNetV2 from proposed to chosen (design.md, decisions marked "Decision record needed").

## Criteria coverage

| # | Criterion | Source | Scenario |
|---|---|---|---|
| 1 | WHEN a video file is in `inbox/` and `mood ingest` runs THEN the library holds one Shot row per continuous take, with its source file, source hash, start, end and duration in seconds | spec "Split videos into shots" / "Ingest videos from the inbox" | Shots follow cuts; Video in inbox is ingested |
| 2 | WHEN a video is ingested THEN one Source row holds its content hash, path, ingest time, shot count and the splitter used | `okf/data/shot.md` | Source row recorded |
| 3 | WHEN ingest runs on a file whose content is already in the library (same file, or a renamed copy) THEN no rows are added and the file is reported as skipped | spec "Same file twice", Jira | Same file twice; Already ingested file skipped; Renamed copy skipped |
| 4 | WHEN a video has no cuts THEN it is stored as one shot covering the whole video | checklist: edges | Video without cuts |
| 5 | WHEN the splitter finds a shot shorter than 1 s THEN it is not stored and the report counts it | owner answer | Short shot dropped |
| 6 | WHEN a file in `inbox/` cannot be read as a video THEN it is reported with the reason, the other files are still ingested, no rows are stored for it, and ingest exits non-zero | owner answer / checklist: errors | Unreadable file reported; Splitter fails on one file (owner answer: same handling when TransNetV2 fails on one file after loading) |
| 7 | WHEN `inbox/` holds a file without a video extension THEN it is left alone and listed as ignored | owner answer | Non-video file ignored |
| 8 | WHEN `inbox/` has no video files THEN ingest reports nothing to ingest and exits 0 | checklist: edges | Nothing to ingest |
| 9 | WHEN TransNetV2 cannot be loaded THEN PySceneDetect splits the videos, the report warns about it, and each Source row records which splitter ran | owner answer | Fallback splitter used |
| 10 | WHEN ingest stops before a file is fully split and stored THEN that file has no rows, and the next run ingests it | `okf/decisions/003-one-gpu-model-at-a-time.md` (resumable passes) / checklist: run twice | Interrupted file ingested again |
| 11 | WHEN the split pass ends THEN the splitter model is freed from the GPU before anything else is loaded | `okf/decisions/003-one-gpu-model-at-a-time.md`, spec "Fit the GPU" | Splitter freed after split |
| 12 | WHEN `mood ingest --json` runs THEN it prints one JSON document listing each file with its outcome (ingested with shot count, skipped, failed with reason, ignored) | mood-cli "JSON output on every command" | Ingest JSON report |
| 13 | WHEN a video is in a subfolder of `inbox/` THEN it is ingested like a top-level video | owner answer | Video in subfolder ingested |
| 14 | WHEN `inbox/` does not exist THEN ingest stops with a message naming the path and how to fix it, and exits non-zero | owner answer / checklist: errors | Missing inbox reported |
| 15 | WHEN two new files in one run have the same content THEN only the first in path order is ingested and the other is reported as skipped | test case MOOD-3-20, owner answer 2026-10-22 | Same content twice in one run |

Considered, not needed:
- Moving files to `processed/`: backlog row 7 (keeper export); the scenario "Processed file leaves inbox" stays for it.
- Cheap pass, junk removal, tags: later tickets, each adds its columns by migration.
- Permissions and personal data: local single-user tool; no new personal data beyond what `okf/data/shot.md` already notes (people in home movies).
- Performance threshold: none stated in the ticket or the decisions.
- Progress display: not asked.

Open questions: none.

## Not in Jira yet

None: all criteria written to MOOD-3 on 2026-10-22 09:54.

## Jira acceptance criteria

Read from MOOD-3 on 2026-10-22 09:54
- WHEN a video file is in `inbox/` and `mood ingest` runs THEN the library holds one Shot row per continuous take, with its source file, source hash, start, end and duration in seconds
- WHEN a video is ingested THEN one Source row holds its content hash, path, ingest time, shot count and the splitter used
- WHEN ingest runs on a file whose content is already in the library (same file, or a renamed copy) THEN no rows are added and the file is reported as skipped
- WHEN a video has no cuts THEN it is stored as one shot covering the whole video
- WHEN the splitter finds a shot shorter than 1 s THEN it is not stored and the report counts it
- WHEN a file in `inbox/` cannot be read as a video THEN it is reported with the reason, the other files are still ingested, no rows are stored for it, and ingest exits non-zero
- WHEN `inbox/` holds a file without a video extension THEN it is left alone and listed as ignored
- WHEN `inbox/` has no video files THEN ingest reports nothing to ingest and exits 0
- WHEN TransNetV2 cannot be loaded THEN PySceneDetect splits the videos, the report warns about it, and each Source row records which splitter ran
- WHEN ingest stops before a file is fully split and stored THEN that file has no rows, and the next run ingests it
- WHEN the split pass ends THEN the splitter model is freed from the GPU before anything else is loaded
- WHEN `mood ingest --json` runs THEN it prints one JSON document listing each file with its outcome (ingested with shot count, skipped, failed with reason, ignored)
- WHEN a video is in a subfolder of `inbox/` THEN it is ingested like a top-level video
- WHEN `inbox/` does not exist THEN ingest stops with a message naming the path and how to fix it, and exits non-zero
- WHEN two new files in one run have the same content THEN only the first in path order is ingested and the other is reported as skipped
