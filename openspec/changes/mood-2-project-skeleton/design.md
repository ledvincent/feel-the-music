# Design

## Context

No code exists yet (see proposal.md, Why). The kickoff design fixed the module layout (`mood.cli`, `mood.config`, …) and the rule that the CLI is the only interface, with `--json` for Claude Code (`openspec/changes/archive/2026-10-12-mood-1-kickoff/design.md`). This design follows `okf/architecture/tech-stack.md`, `okf/decisions/001-claude-code-orchestrates-local-tools.md`, `okf/decisions/002-python-312-uv-windows-cuda.md` and `okf/decisions/003-one-gpu-model-at-a-time.md`.

Code is written on a laptop without CUDA (Intel Arc) and run on the RTX 3060 Ti PC. Tests must pass on both, on CPU, with no network.

## Goals / Non-Goals

**Goals:**
- A layout and conventions every later command copies: one sub-command module, a result object, text or JSON rendering.
- `mood doctor` testable without a GPU, FFmpeg or yt-dlp, through injectable probes.

**Non-Goals:**
- Loading any model, touching LanceDB, creating folders on disk (doctor only reports whether they exist).

## Decisions

**D1. src layout, package `mood`, console script `mood`.** `src/mood/` with `cli.py`, `config.py`, `doctor.py`; `[project.scripts] mood = "mood.cli:app"`. The src layout keeps tests running against the installed package. Alternative: flat layout; it lets tests import the working tree by accident.

**D2. Typer for the CLI.** Sub-commands as functions with type hints, good help text, built on Click. A shared callback adds the global `--json` option, stored on the context, so every command gets it without repeating it. Errors (unknown command, bad config) are caught at the top and printed as `{"ok": false, "error": "..."}` when `--json` is set. Alternatives: argparse (more boilerplate per command, no shared-option pattern), Click directly (Typer is Click with less code). Decision record needed: the CLI library shapes every later command.

**D3. One result shape.** Each command returns a plain dict (or a dataclass turned into one); one renderer prints it as JSON (`ok`, plus command fields) or as text. Commands never `print` directly. This makes "every command accepts json" one parametrised test over all registered commands.

**D4. Config with `tomllib` and a frozen dataclass.** `mood.toml` at the project root; the project root is the folder holding `pyproject.toml`, or the `MOOD_ROOT` environment variable when set (tests use a temporary folder). Table `[folders]` with keys `inbox`, `processed`, `library`, `audio`, `reels`, `models`; unknown keys are an error, so typos are caught. A commented `mood.example.toml` is committed; `mood.toml` itself is git-ignored, as it holds paths for one machine. Alternative: pydantic-settings; one more dependency for six paths.

**D5. Doctor as a list of independent checks.** Each check is a function returning `{name, ok, value, hint}` and catching its own errors, so one failure never stops the others. Probes:
- GPU and VRAM: `nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader` (works even when PyTorch is CPU-only, so the hint can say which is wrong).
- PyTorch: `torch.__version__`, `torch.version.cuda`, `torch.cuda.is_available()`, device name. Imported inside the check, so `mood --help` stays fast.
- FFmpeg: `ffmpeg -version`, first line.
- yt-dlp: `yt_dlp.version.__version__`.
- Folders: from config, existence only.
Probes are passed in (a small `Probes` object with defaults), so tests give fakes. VRAM below 8 GB is reported as a warning, not a failure: the 8 GB budget is a design rule (003), not a hard limit for the check.

**D6. PyTorch from the CUDA index through uv.** `[tool.uv.sources] torch = { index = "pytorch-cu124" }` with an explicit index `https://download.pytorch.org/whl/cu124`, marked `explicit = true` so only torch comes from it. On the laptop the same lock installs the CUDA wheel; it runs on CPU, and doctor reports the PyTorch check as failed there, which is correct. Alternative: a CPU extra for the laptop; two lock variants for little gain. Decision record needed only if the CUDA version changes later; it is pinned in `uv.lock` as the tech stack says.

**D7. yt-dlp as a Python dependency.** Installed by uv, run as `uv run yt-dlp` or imported; updated with `uv lock --upgrade-package yt-dlp`. Alternative: a separate install on `PATH`; one more thing the owner has to keep current. FFmpeg stays an external program (no good wheel with NVENC).

**D8. ruff and pytest in `pyproject.toml`.** ruff: line length 100, rules `E,F,I,UP,B`, target `py312`. pytest: `testpaths = ["tests"]`, a `gpu` marker reserved for later manual tests, never run by default.

## Risks / Trade-offs

- [The CUDA wheel is large (≈2.5 GB) to install on the laptop just to run tests] → acceptable once; tests never import torch outside the doctor probe, and that probe is faked in tests.
- [`nvidia-smi` missing on PATH even with a driver] → the hint names the usual location (`C:\Windows\System32`) and the PyTorch check still runs.
- [cu124 wheels drop support or the driver is older] → doctor prints the driver version next to the CUDA version so the mismatch is visible.

## Migration Plan

New code only. Rollback is reverting the PR.
