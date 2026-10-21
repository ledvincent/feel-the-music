# Tasks

## 1. Dependencies and test fixtures

- [ ] 1.1 Add `lancedb`, `pyarrow`, `av`, `scenedetect`, `opencv-python-headless` and `huggingface_hub` to `pyproject.toml` (design D14), run `uv sync` on the laptop and on the RTX 3060 Ti PC, and verify `uv run python -c "import lancedb, av, scenedetect, huggingface_hub"` succeeds on both
- [ ] 1.2 Add test helpers in `tests/conftest.py`: a `make_video(path, segments)` fixture that writes a tiny video with PyAV at test time (mpeg4, 64×36, 10 fps, one solid colour per segment, so each colour change is a cut), a `FakeSplitter` returning a given `SplitResult` per file and recording `load`, `split` and `free` events, and an `inbox` fixture under the temporary project; verify `uv run pytest` still passes and no media file is added to git

## 2. Splitters (`mood.ingest.split`)

- [ ] 2.1 Pick the Hugging Face repository and revision holding the TransNetV2 PyTorch weights, check its licence, and pin both in `src/mood/ingest/split.py`; if no repository fits, stop and ask the owner (design Risks)
- [ ] 2.2 Write the `Splitter` interface, `SplitResult`, and the shared cuts-to-shots function: half-open spans from timestamps, a result without cuts as one whole-video shot, shots under 1.0 s dropped and counted (design D5); verify with unit tests on hand-made `SplitResult`s
- [ ] 2.3 Write the PySceneDetect splitter (ContentDetector, PyAV backend, CPU) returning `cuts_s` from its scene list (design D7); verify on a generated two-colour video that it finds the one cut within one frame
- [ ] 2.4 Vendor the TransNetV2 PyTorch model definition with its MIT licence header as `src/mood/ingest/transnetv2_model.py`, and write the TransNetV2 splitter: weights from `models/transnetv2/` or downloaded once, PyAV frames at 48×27 in windows of 100, threshold 0.5, CUDA when available else CPU, torch imported only on load (design D6); verify the module imports without torch loaded and `uv run ruff check .` passes
- [ ] 2.5 Write `load_splitter(models_dir)` as a context manager: TransNetV2 first, PySceneDetect plus a warning with the reason when TransNetV2 cannot be loaded, model freed on exit also after an error (design D7, D8); verify with tests that fake a missing weights file and a failing download

## 3. Library (`mood.library`)

- [ ] 3.1 Write the Shot and Source Arrow schemas with only this ticket's columns, `PIPELINE_VERSION = 1`, `SCHEMA_VERSION = 1`, the `meta` table and the empty migration list run on open (design D2); verify that opening a new `library/` creates the three tables and that opening it again changes nothing
- [ ] 3.2 Write `Library`: source lookup by hash, `store_file(source, shots)` writing the Shot rows in one add then the Source row (design D9), and the cleanup of Shot rows without a Source row on open; verify with unit tests on a temporary folder
- [ ] 3.3 Write the content hash (SHA-256, 1 MiB chunks) and the shot id `<16 hex of hash>-<start ms, 9 digits>` (design D3, D4); verify the id of a known hash and start, and that a copy of a file has the same hash

## 4. The ingest pass and `mood ingest`

- [ ] 4.1 Write `mood.ingest.inbox`: walk `inbox/` at any depth, sort files into videos (fixed extensions, any case) and ignored files, name each by its path relative to `inbox/` with forward slashes, and raise `ConfigError` naming the path and the fix when `inbox/` is missing (design D12, D13); verify with unit tests
- [ ] 4.2 Write `mood.ingest.run.ingest(config, splitter_factory)`: hash in path order, skip known hashes and any hash an earlier file of the same run already has (reason `same content as <first file>`), load the splitter only when a file is left, open-check and split each file, store it right away, fail a file with its reason (unreadable, or any splitter error) and go on with the same splitter, free the splitter, build the report (design D8, D10, D11); verify with tests using `FakeSplitter`
- [ ] 4.3 Add the `ingest` command to `src/mood/cli.py` with the shared `--json` option, the text renderer, and exit code 1 when any file failed; verify `tests/test_cli.py::test_every_command_accepts_json` passes for `ingest` in an empty project
- [ ] 4.4 Add `mood ingest` to the Commands section of `CLAUDE.md` and verify it runs as written

## 5. Checks on the owner's PC (manual)

- [ ] 5.1 Run `uv run mood ingest --json` on the RTX 3060 Ti PC with a film, a phone video and a text file in `inbox/`; verify the report, that TransNetV2 ran, and spot-check five shot boundaries against the video (paste the output in the PR)
- [ ] 5.2 Rename the weights folder, run again on a new file, and verify PySceneDetect ran with the warning; restore the folder
- [ ] 5.3 Verify `torch.cuda.memory_allocated()` is back to its value before the pass once the pass ends, and that peak VRAM stays under 8 GB (`uv run pytest -m gpu tests/test_gpu_ingest.py`)

## 6. Proof

The scenario "Processed file leaves inbox" is unchanged and belongs to backlog row 7 (keeper export); this change does not test it.

- [ ] 6.1 Test `Video in inbox is ingested` in `tests/test_ingest.py`
- [ ] 6.2 Test `Same file twice` in `tests/test_ingest.py`
- [ ] 6.3 Test `Video in subfolder ingested` in `tests/test_ingest.py`
- [ ] 6.4 Test `Shots follow cuts` in `tests/test_ingest.py` (generated video with two cuts, PySceneDetect and `FakeSplitter`; checks source file, source hash, start, end and duration of each Shot row)
- [ ] 6.5 Test `Video without cuts` in `tests/test_split.py`
- [ ] 6.6 Test `Runs on an 8 GB GPU` in `tests/test_gpu_ingest.py` (marked `gpu`, run by hand in task 5.3)
- [ ] 6.7 Test `Splitter freed after split` in `tests/test_ingest.py` (event order with `FakeSplitter`, also when one split raises)
- [ ] 6.8 Test `Source row recorded` in `tests/test_library.py`
- [ ] 6.9 Test `Already ingested file skipped` in `tests/test_ingest.py`
- [ ] 6.10 Test `Renamed copy skipped` in `tests/test_ingest.py`
- [ ] 6.11 Test `Short shot dropped` in `tests/test_split.py`
- [ ] 6.12 Test `Unreadable file reported` in `tests/test_ingest.py`
- [ ] 6.13 Test `Splitter fails on one file` in `tests/test_ingest.py` (`FakeSplitter` raising on one of three files)
- [ ] 6.14 Test `Missing inbox reported` in `tests/test_ingest.py` (text and `--json`)
- [ ] 6.15 Test `Non-video file ignored` in `tests/test_ingest.py`
- [ ] 6.16 Test `Nothing to ingest` in `tests/test_ingest.py`
- [ ] 6.17 Test `Fallback splitter used` in `tests/test_split.py`
- [ ] 6.18 Test `Interrupted file ingested again` in `tests/test_library.py`
- [ ] 6.19 Test `Ingest JSON report` in `tests/test_ingest.py`
- [ ] 6.20 Test `Same content twice in one run` in `tests/test_ingest.py`

Test cases from `test-cases/MOOD-3.md` (qc: none). Each automated case has a test whose name contains its ID; it can be the scenario test named in brackets. Manual cases MOOD-3-03 and MOOD-3-21 are run in tasks 5.1 and 5.3 and get no task.

- [ ] 6.21 Test `MOOD-3-01` in `tests/test_ingest.py` (with `Shots follow cuts`)
- [ ] 6.22 Test `MOOD-3-02` in `tests/test_library.py` (with `Source row recorded`)
- [ ] 6.23 Test `MOOD-3-04` in `tests/test_ingest.py` (with `Ingest JSON report`)
- [ ] 6.24 Test `MOOD-3-05` in `tests/test_ingest.py` (with `Already ingested file skipped`)
- [ ] 6.25 Test `MOOD-3-06` in `tests/test_ingest.py` (with `Renamed copy skipped`)
- [ ] 6.26 Test `MOOD-3-07` in `tests/test_split.py` (with `Video without cuts`)
- [ ] 6.27 Test `MOOD-3-08` in `tests/test_ingest.py` (with `Video in subfolder ingested`)
- [ ] 6.28 Test `MOOD-3-09` in `tests/test_split.py` (with `Fallback splitter used`)
- [ ] 6.29 Test `MOOD-3-10` in `tests/test_split.py` (with `Short shot dropped`)
- [ ] 6.30 Test `MOOD-3-11` in `tests/test_split.py` (a shot of exactly 1.0 s is kept)
- [ ] 6.31 Test `MOOD-3-12` in `tests/test_ingest.py` (with `Unreadable file reported`)
- [ ] 6.32 Test `MOOD-3-13` in `tests/test_ingest.py` (with `Splitter fails on one file`)
- [ ] 6.33 Test `MOOD-3-14` in `tests/test_ingest.py` (with `Non-video file ignored`)
- [ ] 6.34 Test `MOOD-3-15` in `tests/test_ingest.py` (video extensions in any letter case)
- [ ] 6.35 Test `MOOD-3-16` in `tests/test_ingest.py` (with `Nothing to ingest`)
- [ ] 6.36 Test `MOOD-3-17` in `tests/test_ingest.py` (with `Missing inbox reported`)
- [ ] 6.37 Test `MOOD-3-18` in `tests/test_library.py` (with `Interrupted file ingested again`)
- [ ] 6.38 Test `MOOD-3-19` in `tests/test_ingest.py` (with `Splitter freed after split`)
- [ ] 6.39 Test `MOOD-3-20` in `tests/test_ingest.py` (with `Same content twice in one run`)
