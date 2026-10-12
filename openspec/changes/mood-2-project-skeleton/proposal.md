Jira: MOOD-2
Size: normal

# Proposal

## Why

There is no code yet. Every later ticket (shot splitting, search, rendering) needs the same base: the `mood` package, one CLI that Claude Code can read with `--json`, the working folders from `mood.toml`, and tests and lint. The owner's PC also needs a quick check that the GPU, CUDA PyTorch, FFmpeg and yt-dlp work before any heavy pass runs. This is backlog row 1 of the MOOD-1 kickoff and blocks everything else.

## What Changes

- Python 3.12 package `mood` managed with uv (`pyproject.toml`, `uv.lock`), with the CUDA build of PyTorch from its index (`okf/decisions/002-python-312-uv-windows-cuda.md`).
- The `mood` command line. Every command accepts `--json`, before or after the command name, and then prints one JSON document on stdout.
- Config: the working folders (`inbox/`, `processed/`, `library/`, `audio/`, `reels/`, `models/`) come from `mood.toml`; when the file or a key is missing, defaults under the project root apply.
- `mood doctor`: checks the NVIDIA GPU and its VRAM, the CUDA build of PyTorch, FFmpeg and yt-dlp; runs every check, marks each ok, warning (VRAM under 8 GB) or failed, gives a fix hint for each failure, and exits non-zero when any check fails.
- `uv run pytest` (CPU only, no network, fake probes) and `uv run ruff check .` / `uv run ruff format .` configured.
- `.gitignore` gains the working folders, so media and models are never committed.

## Out of scope

- Any other command (`ingest`, `search`, `render`, …): each comes with its own ticket.
- Downloading models into `models/`, LanceDB setup, loading any GPU model.
- Installing FFmpeg, yt-dlp or the NVIDIA driver: `mood doctor` reports them, it does not install them.
- CI changes beyond what exists (`dirox-checks.yml`); running pytest in CI is a later ticket if wanted.

## Capabilities

### New Capabilities
- `mood-cli`: the shell every command shares (`--json` output, folder config from `mood.toml`) and `mood doctor`, the environment check.

### Modified Capabilities
None.

## Not in Jira yet

The ticket has no acceptance criteria list; its description was read as the criteria. `Every command accepts json` and `Healthy machine` cover it. The other scenarios add behaviour decided while sizing on 2026-10-13; the ticket owner adds them to MOOD-2 before approving:
- `Json flag in either position`: `mood --json doctor` and `mood doctor --json` both work.
- `Unknown command in JSON mode`: errors are JSON too when `--json` is given.
- `Low VRAM is a warning`: under 8 GB is a warning and doctor still exits 0.
- `Missing config uses defaults`, `Config overrides a folder`, `Invalid config is reported`: `mood.toml` is optional and only overrides.
- `CPU-only PyTorch fails the check`: for example on the planning laptop (Intel Arc, no CUDA).
- `Doctor shows the folders`: doctor lists the working folders in use.
- `Doctor reports every failure`, `Doctor exit code`: every check runs, each failure has a fix hint, the exit code is non-zero.

pytest and ruff (in the description) are tooling, not behaviour: tasks set them up, and no scenario covers them.

## Impact

- New: `pyproject.toml`, `uv.lock`, `src/mood/`, `tests/`, a commented `mood.example.toml`.
- Changed: `.gitignore`.
- Dependencies: PyTorch (CUDA index), a CLI library, yt-dlp, pytest, ruff. FFmpeg is an external program found on `PATH`.
- Knowledge: `okf/architecture/tech-stack.md`, `okf/decisions/002-python-312-uv-windows-cuda.md`, `okf/decisions/003-one-gpu-model-at-a-time.md`.
