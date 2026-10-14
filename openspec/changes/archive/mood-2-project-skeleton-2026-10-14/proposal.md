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

## Impact

- New: `pyproject.toml`, `uv.lock`, `src/mood/`, `tests/`, a commented `mood.example.toml`.
- Changed: `.gitignore`.
- Dependencies: PyTorch (CUDA index), a CLI library, yt-dlp, pytest, ruff. FFmpeg is an external program found on `PATH`.
- Knowledge: `okf/architecture/tech-stack.md`, `okf/decisions/002-python-312-uv-windows-cuda.md`, `okf/decisions/003-one-gpu-model-at-a-time.md`.

## Criteria coverage

| Acceptance criterion | Source | Scenario |
|---|---|---|
| WHEN any `mood` command runs with `--json` THEN its stdout parses as one JSON document | Jira MOOD-2 (ticket description) | Every command accepts json |
| WHEN `mood --json doctor` and `mood doctor --json` run THEN both succeed with the same JSON | Jira MOOD-2 (proposal review) | Json flag in either position |
| WHEN `mood --json` gets an unknown command THEN one JSON error and a non-zero exit | Jira MOOD-2 (sizing, 2026-10-13) | Unknown command in JSON mode |
| WHEN there is no `mood.toml` THEN each folder is its default under the project root | Jira MOOD-2 (sizing, 2026-10-13) | Missing config uses defaults |
| WHEN `mood.toml` sets only the inbox THEN the other folders keep their defaults | Jira MOOD-2 (sizing, 2026-10-13) | Config overrides a folder |
| WHEN `mood.toml` is invalid or has an unknown setting THEN the command stops, names the file and the problem, exits non-zero | Jira MOOD-2 (sizing, 2026-10-13) | Invalid config is reported |
| WHEN every doctor check passes THEN GPU, VRAM, PyTorch/CUDA, FFmpeg and yt-dlp are listed ok and exit 0 | Jira MOOD-2 (ticket description); `okf/decisions/002-python-312-uv-windows-cuda.md` | Healthy machine |
| WHEN VRAM is under 8 GB THEN the VRAM check is a warning and exit 0 | Jira MOOD-2 (proposal review); `okf/decisions/003-one-gpu-model-at-a-time.md` | Low VRAM is a warning |
| WHEN PyTorch has no CUDA or sees no GPU THEN the PyTorch check fails with the matching hint | Jira MOOD-2 (sizing, 2026-10-13) | CPU-only PyTorch fails the check |
| WHEN doctor runs THEN it lists the working folders and whether each exists | Jira MOOD-2 (sizing, 2026-10-13) | Doctor shows the folders |
| WHEN FFmpeg and yt-dlp are both missing THEN both fail with their own hint and the other checks still run | Jira MOOD-2 (sizing, 2026-10-13) | Doctor reports every failure |
| WHEN any check fails THEN doctor exits non-zero, also with `--json` | Jira MOOD-2 (sizing, 2026-10-13) | Doctor exit code |

Considered, not needed:
- pytest and ruff set up: tooling, not behaviour; tasks 1.1 and 1.3 cover them.
- Doctor creating missing folders: doctor only reports; folders are created by the commands that write to them (later tickets).
- A minimum NVIDIA driver version: doctor shows the driver next to the CUDA version; a fixed minimum would go stale with each PyTorch update.
- Checking that YouTube is reachable: doctor stays offline; download problems are reported by `mood audio` (MOOD-15).
- Checking models in `models/`: no model is used yet; each model's ticket checks its own files.

Open questions: none.

## Jira acceptance criteria

Read from MOOD-2 on 2026-10-13 15:03

- WHEN any mood command runs with --json THEN its standard output parses as one JSON document
- WHEN `mood --json doctor` and `mood doctor --json` run on the same machine THEN both succeed and print the same JSON document
- WHEN `mood --json` is given a command that does not exist THEN it prints one JSON document with an error message and exits non-zero
- WHEN there is no mood.toml THEN each working folder is the folder of the same name under the project root
- WHEN mood.toml sets only the inbox folder THEN the inbox is that path and the other folders keep their defaults
- WHEN mood.toml is not valid TOML or names an unknown setting THEN the command stops with a message naming the file and the problem, and exits non-zero
- WHEN mood doctor runs on a machine where every check passes THEN it lists the GPU name and VRAM, the PyTorch and CUDA versions, the FFmpeg version and the yt-dlp version, each marked ok, and exits 0
- WHEN the GPU has less than 8 GB of VRAM and every other check passes THEN the VRAM check is marked warning with the amount found, and mood doctor exits 0
- WHEN the installed PyTorch has no CUDA support or sees no GPU THEN the PyTorch check is marked failed, with a hint to install the CUDA build when PyTorch has no CUDA support, or to check the NVIDIA driver when the CUDA build sees no GPU
- WHEN mood doctor runs THEN it lists the working folders in use and whether each exists
- WHEN FFmpeg and yt-dlp are both missing THEN both checks are marked failed, each with its own fix hint, and the other checks still run
- WHEN at least one check fails THEN mood doctor exits with a non-zero code, also with --json
