---
jira: MOOD-3
qc: none
status: draft
cap: footage-ingest
---
# MOOD-3 · Shot splitting: ingest videos from inbox/ into one LanceDB row per shot

## Open questions
- [x] After a successful ingest, is the video moved from `inbox/` to `processed/` in this ticket, or later? Answer: later. MOOD-3 never moves or deletes files; moving to `processed/` is MOOD-8 (keeper export). Design D10, D12.
- [x] Where does a skipped file (content already in the library) end up? Answer: it stays in `inbox/`, for the same reason.
- [x] When two files with the same content are both new in one run, is the first ingested and the second reported as skipped? Answer (owner, 2026-10-22): yes. Files are taken in path order; the first is ingested, the later one is reported as skipped, with a reason naming the first file. MOOD-3-20.
- [x] When every shot of a video is shorter than 1 s, how is it reported? Answer: it is ingested with a Source row, `shot_count` 0 and no Shot rows, so it is not split again. Design D5.
- [x] When neither TransNetV2 nor PySceneDetect can be loaded, what does ingest do? Answer (owner, 2026-10-22): every video fails with that reason, no rows are written, and ingest exits non-zero. PySceneDetect runs on CPU with no model, so no case is written for it.
- [x] Exact wording of the plain-text report lines? Answer: the cases check the meaning. The design fixes "Nothing to ingest in <inbox>" and the missing-inbox message (D11, D13).

## MOOD-3-01 · A video with several cuts is stored as one Shot row per take
- Priority: High
- Type: smoke
- Proof: automated
- Covers: One Shot row per continuous take, with source file, source hash, start, end and duration in seconds

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` exists.
- `inbox/test-clip-three-takes.mp4`: a tiny synthetic video of 9 s made of three takes, cut at 3 s and 6 s (a fake splitter returning those cuts is fine for this check).

Steps:
1. Run `uv run mood ingest`.
2. Note the content hash of `test-clip-three-takes.mp4` given by the report or the Source row.
3. List the Shot rows of the library.

Expected:
1. The command exits 0.
2. The library holds exactly 3 Shot rows for `test-clip-three-takes.mp4`.
3. Their start and end times are 0 to 3, 3 to 6 and 6 to 9 seconds, and each duration is end minus start (3 s).
4. Each row's source file is `test-clip-three-takes.mp4` and its source hash is the hash noted in step 2.

## MOOD-3-02 · An ingested video gets one Source row
- Priority: High
- Type: smoke
- Proof: automated
- Covers: One Source row with content hash, path, ingest time, shot count and splitter used

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds only `test-clip-three-takes.mp4` (as in MOOD-3-01).

Steps:
1. Note the current date and time.
2. Run `uv run mood ingest`.
3. List the Source rows of the library.

Expected:
1. There is exactly one Source row.
2. It holds the file's content hash (the same as the source hash of its Shot rows), its path, an ingest time not earlier than the time noted in step 1, a shot count of 3 (equal to its number of Shot rows) and the name of the splitter that ran.

## MOOD-3-03 · Real ingest on the owner's GPU with TransNetV2
- Priority: High
- Type: smoke
- Proof: manual (needs the owner's RTX 3060 Ti, CUDA and the real TransNetV2 weights; developer tests run on CPU with fake splitters)
- Covers: Shots stored per take; Source row records the splitter; splitter freed from the GPU when the split pass ends

Pre-conditions:
- User: Owner, at a terminal in the project folder on the RTX 3060 Ti PC (local CLI, no login).
- `uv run mood doctor` reports the GPU, CUDA, FFmpeg and folders as OK.
- A test library folder that is empty (for example `folders.library` in `mood.toml` pointed at a fresh folder).
- `inbox/` holds two short videos the owner is free to use (for example two 1 to 3 minute self-shot clips with visible cuts).
- A second terminal open with `nvidia-smi -l 1` running.

Steps:
1. Run `uv run mood ingest`.
2. Watch the GPU memory in the second terminal while it runs, and note the highest value.
3. When the command returns, read the report and the GPU memory in the second terminal.

Expected:
1. The command exits 0 and the report lists both videos as ingested, each with a shot count, and names TransNetV2 as the splitter, with no fallback warning.
2. GPU memory never goes above 8 GB and there is no out-of-memory error.
3. After the command returns, the GPU memory used by the ingest process is back to its level before the run.
4. Each video has one Source row whose splitter is TransNetV2 and whose shot count equals its number of Shot rows.

## MOOD-3-04 · JSON report lists each file once with its outcome
- Priority: High
- Type: regression
- Proof: automated
- Covers: `mood ingest --json` prints one JSON document listing each file with its outcome

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- `test-clip-a.mp4` (two takes) was ingested in an earlier run, and a copy of it is placed back in `inbox/`.
- `inbox/` also holds `test-clip-b.mp4` (a new tiny video with three takes), `broken-clip.mp4` (a text file renamed to `.mp4`) and `notes.txt`.

Steps:
1. Run `uv run mood ingest --json` and keep its standard output.
2. Parse the output as JSON.

Expected:
1. The whole output is one valid JSON document.
2. It lists each of the four files exactly once.
3. `test-clip-b.mp4` is ingested with a shot count of 3 (and a count of dropped short shots of 0); `test-clip-a.mp4` is skipped; `broken-clip.mp4` is failed with a reason; `notes.txt` is ignored.
4. The document names the splitter that ran.
5. The command exits non-zero (because of the failed file).

## MOOD-3-05 · Running ingest again on the same file adds nothing
- Priority: High
- Type: regression
- Proof: automated
- Covers: A file whose content is already in the library adds no rows and is reported as skipped (same file)

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- `test-clip-three-takes.mp4` was ingested once (1 Source row, 3 Shot rows) and is in `inbox/` again, unchanged.

Steps:
1. Count the Shot and Source rows.
2. Run `uv run mood ingest`.
3. Count the Shot and Source rows again.

Expected:
1. The report lists `test-clip-three-takes.mp4` as skipped.
2. The counts are the same as in step 1: no Shot or Source row added.
3. The command exits 0.

## MOOD-3-06 · A renamed copy of an ingested file is skipped
- Priority: High
- Type: regression
- Proof: automated
- Covers: A file whose content is already in the library adds no rows and is reported as skipped (renamed copy)

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- `test-clip-three-takes.mp4` was ingested once.
- `inbox/renamed-copy.mp4`: a byte-for-byte copy of `test-clip-three-takes.mp4` under a new name.

Steps:
1. Count the Shot and Source rows.
2. Run `uv run mood ingest`.
3. Count the Shot and Source rows again.

Expected:
1. The report lists `renamed-copy.mp4` as skipped.
2. No Shot or Source row is added.

## MOOD-3-07 · A video without cuts is stored as one shot covering the whole video
- Priority: High
- Type: regression
- Proof: automated
- Covers: A video with no cuts is stored as one shot covering the whole video

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/test-clip-one-take.mp4`: a tiny synthetic video of 5 s in a single take.

Steps:
1. Run `uv run mood ingest`.
2. List the Shot rows and the Source row of `test-clip-one-take.mp4`.

Expected:
1. Exactly one Shot row, starting at 0 and ending at 5 s (the end of the video), duration 5 s.
2. The Source row's shot count is 1, and the report lists the file as ingested with 1 shot.

## MOOD-3-08 · A video in a subfolder of inbox/ is ingested like a top-level one
- Priority: High
- Type: regression
- Proof: automated
- Covers: A video in a subfolder of `inbox/` is ingested like a top-level video

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/test-folder/deeper/test-clip-sub.mp4`: a tiny video with two takes; `inbox/test-clip-top.mp4`: a tiny video with two takes.

Steps:
1. Run `uv run mood ingest`.
2. List the Shot and Source rows.

Expected:
1. Both files are reported as ingested, with 2 shots each.
2. The Shot rows of the subfolder video name it by its path inside `inbox/` (`test-folder/deeper/test-clip-sub.mp4`).
3. Each file has one Source row.

## MOOD-3-09 · TransNetV2 cannot be loaded: PySceneDetect splits and the report warns
- Priority: High
- Type: regression
- Proof: automated
- Covers: Fallback to PySceneDetect when TransNetV2 cannot be loaded, warning in the report, splitter recorded per Source row

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; TransNetV2 cannot be loaded (its weights are missing and cannot be downloaded: no network).
- `inbox/test-clip-three-takes.mp4` (hard cuts at 3 s and 6 s).

Steps:
1. Run `uv run mood ingest`.
2. Read the report.
3. Open the Source row of `test-clip-three-takes.mp4`.

Expected:
1. The video is ingested and its Shot rows are stored.
2. The report warns that the fallback splitter ran instead of TransNetV2.
3. The Source row records `pyscenedetect` as the splitter.
4. The command does not fail because of the missing model.

## MOOD-3-10 · A shot shorter than 1 s is dropped and counted
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: A shot shorter than 1 s is not stored and the report counts it

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/test-clip-short-take.mp4`: a tiny video of 7.5 s whose takes are 0 to 3 s, 3 to 3.5 s (0.5 s) and 3.5 to 7.5 s.

Steps:
1. Run `uv run mood ingest`.
2. List the Shot rows and the Source row of the file.

Expected:
1. 2 Shot rows: 0 to 3 s and 3.5 to 7.5 s; no row for the 0.5 s take.
2. The Source shot count is 2.
3. The report lists the file as ingested with 2 shots and 1 short shot dropped.

## MOOD-3-11 · A shot of exactly 1 s is kept
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: Only shots shorter than 1 s are dropped (boundary)

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/test-clip-one-second.mp4`: a tiny video of 6 s whose takes are 0 to 2 s, 2 to 3 s (exactly 1 s) and 3 to 6 s.

Steps:
1. Run `uv run mood ingest`.
2. List the Shot rows of the file.

Expected:
1. 3 Shot rows, including the 2 to 3 s shot with a duration of 1 s.
2. The report counts 0 dropped short shots for the file.

## MOOD-3-12 · An unreadable video file is reported and the others are still ingested
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: A file that cannot be read as a video is reported with the reason, gets no rows, the others are ingested, ingest exits non-zero

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds `test-clip-three-takes.mp4` (readable), `broken-clip.mp4` (a text file renamed to `.mp4`) and `truncated-clip.mov` (the first half of a valid tiny video).

Steps:
1. Run `uv run mood ingest`.
2. Note the exit code.
3. List the Shot and Source rows, then the content of `inbox/`.

Expected:
1. `test-clip-three-takes.mp4` is ingested with 3 shots.
2. `broken-clip.mp4` and `truncated-clip.mov` are each reported as failed with a reason saying why they cannot be read.
3. Neither failed file has a Shot or Source row, and both are still in `inbox/`.
4. The exit code is non-zero.

## MOOD-3-13 · The splitter fails on one file of several
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: A file the splitter fails on is reported with the reason, gets no rows, the others are ingested by the same splitter, ingest exits non-zero

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds `test-clip-a.mp4`, `test-clip-b.mp4` and `test-clip-c.mp4`, all readable.
- A fake splitter that loads fine and raises an error on `test-clip-b.mp4` only.

Steps:
1. Run `uv run mood ingest`.
2. Note the exit code and the splitter named in the report.
3. List the Source rows.

Expected:
1. `test-clip-b.mp4` is reported as failed with the splitter's error as the reason, has no Shot or Source row and is still in `inbox/`.
2. `test-clip-a.mp4` and `test-clip-c.mp4` are ingested; their Source rows record the same splitter.
3. The splitter was loaded only once for the batch.
4. The exit code is non-zero.

## MOOD-3-14 · A file without a video extension is left alone and listed as ignored
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: A file without a video extension is left alone and listed as ignored

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds `test-clip-three-takes.mp4`, `notes.txt`, `cover.jpg` and `test-folder/song.mp3`.
- Note the size and modification time of the three non-video files.

Steps:
1. Run `uv run mood ingest`.
2. Check the three non-video files and the library.

Expected:
1. `notes.txt`, `cover.jpg` and `test-folder/song.mp3` are listed as ignored.
2. They are still in their place in `inbox/`, with the same size and modification time.
3. They have no Shot or Source row; only `test-clip-three-takes.mp4` is ingested.
4. The command exits 0.

## MOOD-3-15 · Video extensions are recognised in any letter case
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: Video files are recognised by extension (.mp4, .mkv, .mov, .avi, .webm, .m4v, any case); others are ignored

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds six tiny different videos named `t1.MP4`, `t2.mkv`, `t3.Mov`, `t4.avi`, `t5.WEBM`, `t6.m4v`.

Steps:
1. Run `uv run mood ingest`.

Expected:
1. All six files are reported as ingested, none as ignored.
2. The library holds six Source rows.

## MOOD-3-16 · Inbox with no video files: nothing to ingest, exit 0
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: When `inbox/` has no video files, ingest reports nothing to ingest and exits 0

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Case A: `inbox/` exists and is empty. Case B: `inbox/` holds only `notes.txt`.

Steps:
1. With case A, run `uv run mood ingest`, then `uv run mood ingest --json`.
2. With case B, run `uv run mood ingest`.

Expected:
1. Case A: the report says there is nothing to ingest, no row is added and the exit code is 0; with `--json` the output is one JSON document saying the same.
2. Case B: the report says there is nothing to ingest and lists `notes.txt` as ignored, no row is added, and the exit code is 0.

## MOOD-3-17 · Missing inbox folder stops ingest with a fix
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: When `inbox/` does not exist, ingest stops with a message naming the path and how to fix it, and exits non-zero

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Case A: no `mood.toml` and no `inbox/` folder in the project root. Case B: `mood.toml` sets `folders.inbox` to `D:/test-missing-inbox`, which does not exist.
- The library holds one ingested video; note its row counts.

Steps:
1. With case A, run `uv run mood ingest`.
2. With case B, run `uv run mood ingest`, then `uv run mood ingest --json`.
3. Count the library rows.

Expected:
1. Case A: the message names the `inbox` path in the project root and says to create the folder or set `folders.inbox` in `mood.toml`; exit code non-zero.
2. Case B: the message names `D:/test-missing-inbox` and gives the same fix; with `--json` the output is one JSON document carrying that message; exit code non-zero.
3. The row counts are unchanged, and no `inbox/` folder was created.

## MOOD-3-18 · Ingest stopped mid-file: the file has no rows and the next run ingests it
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: When ingest stops before a file is fully split and stored, that file has no rows and the next run ingests it

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds `test-clip-a.mp4` (2 takes) and `test-clip-b.mp4` (3 takes).
- A way to stop ingest after some Shot rows of `test-clip-b.mp4` are written but before it is fully stored (in a test: a fake store that fails at that point; by hand: Ctrl+C).

Steps:
1. Run `uv run mood ingest` and stop it at the point above.
2. List the Shot and Source rows.
3. Run `uv run mood ingest` again, to the end.
4. List the Shot and Source rows again.

Expected:
1. After step 1, `test-clip-b.mp4` has no Shot row and no Source row (it counts as not ingested); `test-clip-a.mp4`, if it was finished, has its full rows.
2. After step 3, `test-clip-b.mp4` is reported as ingested with 3 shots, and has exactly 3 Shot rows and one Source row, with no duplicates.
3. `test-clip-a.mp4` is skipped on the second run if it was finished, and still has exactly 2 Shot rows and one Source row.

## MOOD-3-19 · The splitter is freed when the split pass ends
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: When the split pass ends, the splitter model is freed before anything else is loaded

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- A fake splitter that records when it is loaded and freed, and a fake next model that records when it is loaded.
- Case A: `inbox/` holds two readable tiny videos. Case B: the same, plus a file the fake splitter fails on.

Steps:
1. With case A, run `uv run mood ingest`.
2. With case B, run `uv run mood ingest`.
3. Read the order of loads and frees recorded by the fakes.

Expected:
1. In both cases the splitter is loaded once and freed once.
2. In both cases it is freed before any other model is loaded and before ingest returns, including when a file failed (case B).

## MOOD-3-20 · Same content twice in one run is ingested once
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: Content is recognised by hash, so it is never stored twice

Pre-conditions:
- User: Owner, at a terminal in the project folder (local CLI, no login).
- Empty library; `inbox/` holds `test-clip-three-takes.mp4` and `test-folder/same-clip.mp4`, a byte-for-byte copy of it.

Steps:
1. Run `uv run mood ingest`.
2. List the Shot and Source rows.

Expected:
1. `test-clip-three-takes.mp4` (first in path order) is ingested with 3 shots; `test-folder/same-clip.mp4` is reported as skipped, with a reason naming the first file.
2. The library holds exactly one Source row and 3 Shot rows for that content.

## MOOD-3-21 · Shots match the real cuts of real footage
- Priority: Normal
- Type: regression
- Proof: manual (judging whether shots match the takes needs real footage and a person watching it; tests use tiny generated videos and fake splitters)
- Covers: One Shot row per continuous take, on real videos

Pre-conditions:
- User: Owner, at a terminal in the project folder on the RTX 3060 Ti PC (local CLI, no login).
- A test library folder that is empty.
- `inbox/` holds one 2 to 3 minute clip the owner is free to use, with hard cuts, at least one fade or dissolve and one fast camera move inside a single take.

Steps:
1. Run `uv run mood ingest --json` and note the shot count of the clip.
2. List its Shot rows (start and end).
3. Open the clip in a video player and jump to each start time.

Expected:
1. Each start time lands on a cut (within a few frames), and no shot spans a hard cut.
2. The fast camera move does not cause an extra cut.
3. The shot count in the report equals the number of Shot rows, and no stored shot is shorter than 1 s.
