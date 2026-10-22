## MODIFIED Requirements

### Requirement: Ingest videos from the inbox
The system SHALL take every video file placed in the `inbox/` folder (films, compilations, fan edits, stock footage, home movies) as input to the moment library, whatever its source, when `mood ingest` runs. Files in subfolders of `inbox/`, at any depth, count as well. A video file is a file whose extension is `.mp4`, `.mkv`, `.mov`, `.avi`, `.webm` or `.m4v`, in any letter case. Knowledge: `okf/domain/moment-library.md`

#### Scenario: Video in inbox is ingested
- **WHEN** a video file is in `inbox/` and ingest runs
- **THEN** the video's shots are added to the moment library

#### Scenario: Video in subfolder ingested
- **WHEN** a video file is in a subfolder of `inbox/` and `mood ingest` runs
- **THEN** it is ingested like a top-level video, and its Shot rows name it by its path inside `inbox/`

#### Scenario: Same file twice
- **WHEN** ingest runs on a video that was already ingested
- **THEN** no duplicate shots are added to the moment library

#### Scenario: Processed file leaves inbox
- **WHEN** a video has been ingested
- **THEN** it is moved from `inbox/` to `processed/`, and the library points to its new place

### Requirement: Split videos into shots
The system SHALL split each ingested video into individual shots, one per continuous take, and store one Shot row per shot with its source file, the source's content hash, and its start time, end time and duration in seconds in that file. A video with no cuts SHALL be stored as one shot covering the whole video. Knowledge: `okf/domain/shot.md`, `okf/data/shot.md`

#### Scenario: Shots follow cuts
- **WHEN** a video with several cuts is in `inbox/` and `mood ingest` runs
- **THEN** the library holds one Shot row per continuous take, each with its source file, source hash, start time, end time and duration in seconds

#### Scenario: Video without cuts
- **WHEN** a video with no cuts is ingested
- **THEN** the library holds exactly one Shot row for it, starting at 0 and ending at the end of the video

### Requirement: Fit the GPU
Every model used by ingest SHALL run within 8 GB of VRAM, with only one large model loaded at a time, and without any paid API. The shot splitter SHALL be loaded once for the batch of videos and freed from the GPU when the split pass ends, before anything else is loaded. Knowledge: `okf/decisions/003-one-gpu-model-at-a-time.md`

#### Scenario: Runs on an 8 GB GPU
- **WHEN** ingest runs on an RTX 3060 Ti with 8 GB of VRAM
- **THEN** it completes without running out of GPU memory and without calling a paid service

#### Scenario: Splitter freed after split
- **WHEN** the split pass ends, whether every file succeeded or not
- **THEN** the splitter model has been freed from the GPU before ingest loads anything else or returns

## ADDED Requirements

### Requirement: Source record per video
For each ingested video the library SHALL hold exactly one Source row with the file's content hash, its path, the time it was ingested, the number of shots stored for it and the name of the splitter that split it. Knowledge: `okf/data/shot.md`, `okf/decisions/004-lancedb-one-row-per-shot.md`

#### Scenario: Source row recorded
- **WHEN** a video is ingested
- **THEN** one Source row holds its content hash, its path, its ingest time, its shot count (equal to its number of Shot rows) and the splitter used

### Requirement: Skip content already ingested
Ingest SHALL recognise a file by the hash of its content, not by its name or path. A file whose content hash is already in the library SHALL add no rows and SHALL be reported as skipped. When several new files in one run have the same content, only the first in path order SHALL be ingested; the others SHALL add no rows and SHALL be reported as skipped. Knowledge: `okf/data/shot.md`

#### Scenario: Already ingested file skipped
- **WHEN** `mood ingest` runs again on a file it has already ingested
- **THEN** no Shot or Source row is added and the file is reported as skipped

#### Scenario: Renamed copy skipped
- **WHEN** `inbox/` holds a renamed copy of a file whose content is already in the library
- **THEN** no Shot or Source row is added and the copy is reported as skipped

#### Scenario: Same content twice in one run
- **WHEN** `inbox/` holds two files with the same content, neither of them in the library yet, and `mood ingest` runs
- **THEN** the first in path order is ingested, and the other adds no Shot or Source row and is reported as skipped

### Requirement: Drop shots under one second
Ingest SHALL NOT store a shot shorter than 1 second, and SHALL report for each file how many shots it dropped for being too short. Knowledge: `okf/domain/shot.md`

#### Scenario: Short shot dropped
- **WHEN** the splitter finds a shot shorter than 1 second in a video
- **THEN** that shot has no Shot row, the Source shot count leaves it out, and the report counts it as dropped for that file

### Requirement: Report unreadable files
A file in `inbox/` with a video extension that cannot be read as a video (corrupt, truncated, no video stream), or that the splitter fails on after it loaded, SHALL be reported with the reason, SHALL get no rows and SHALL stay in `inbox/`. Ingest SHALL still ingest the other files with the same splitter and SHALL exit non-zero at the end. Knowledge: `okf/data/shot.md`

#### Scenario: Unreadable file reported
- **WHEN** `inbox/` holds a readable video and a file with a video extension that cannot be read as a video
- **THEN** the readable video is ingested, the unreadable file is reported as failed with the reason, has no Shot or Source row and is still in `inbox/`, and `mood ingest` exits non-zero

#### Scenario: Splitter fails on one file
- **WHEN** the splitter loaded and then fails while splitting one of several videos
- **THEN** that file is reported as failed with the reason, has no Shot or Source row and is still in `inbox/`, the other videos are ingested by the same splitter, and `mood ingest` exits non-zero

### Requirement: Missing inbox reported
When the `inbox/` folder does not exist, `mood ingest` SHALL stop without touching the library, with a message naming the path and saying to create the folder or set `folders.inbox` in `mood.toml`, and SHALL exit non-zero; with `--json` the message is one JSON document.

#### Scenario: Missing inbox reported
- **WHEN** the configured `inbox/` folder does not exist and `mood ingest` runs
- **THEN** it prints a message naming that path and how to fix it, adds no rows, and exits non-zero

### Requirement: Only video files are ingested
Ingest SHALL leave files without a video extension untouched and list them as ignored. When `inbox/` holds no video file, ingest SHALL report that there is nothing to ingest and exit 0.

#### Scenario: Non-video file ignored
- **WHEN** `inbox/` holds a file without a video extension
- **THEN** the file is unchanged in `inbox/`, has no rows, and is listed as ignored

#### Scenario: Nothing to ingest
- **WHEN** `inbox/` holds no video file and `mood ingest` runs
- **THEN** it reports that there is nothing to ingest, adds no rows and exits 0

### Requirement: Fallback shot splitter
TransNetV2 SHALL be the shot splitter. When it cannot be loaded (weights missing and not downloadable, or the model fails to load), PySceneDetect SHALL split the videos instead, the report SHALL warn which splitter ran, and each Source row SHALL record the splitter used. Knowledge: `okf/architecture/tech-stack.md`

#### Scenario: Fallback splitter used
- **WHEN** TransNetV2 cannot be loaded and `mood ingest` runs on a video
- **THEN** the video is split by PySceneDetect, the report warns that the fallback splitter ran, and its Source row records `pyscenedetect` as the splitter

### Requirement: Resumable ingest
A video SHALL be either fully stored (all its kept Shot rows and its Source row) or have no rows at all. When ingest stops before a file is fully split and stored, the next run SHALL ingest that file as if it were new. Knowledge: `okf/decisions/003-one-gpu-model-at-a-time.md`

#### Scenario: Interrupted file ingested again
- **WHEN** ingest stops after some of a file's Shot rows are written but before the file is fully stored, and `mood ingest` runs again
- **THEN** after the stop the file counts as not ingested, and after the next run it has exactly its full set of Shot rows and one Source row, with no duplicates

### Requirement: Ingest report
`mood ingest` SHALL report every file it saw in `inbox/` with its outcome: ingested (with its shot count and its count of dropped short shots), skipped, failed (with the reason) or ignored, plus the splitter that ran and any warning. With `--json` the report is one JSON document. Knowledge: `okf/decisions/001-claude-code-orchestrates-local-tools.md`

#### Scenario: Ingest JSON report
- **WHEN** `mood ingest --json` runs on an inbox holding a new video, an already ingested video, an unreadable video file and a non-video file
- **THEN** it prints one JSON document listing each of the four files once, with outcome ingested and its shot count, skipped, failed with its reason, and ignored
