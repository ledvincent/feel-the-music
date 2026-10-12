---
type: Decision
title: Python 3.12 with uv on Windows and CUDA
description: The project is a Python 3.12 package managed with uv, using the CUDA build of PyTorch on Windows.
owner: ledvincent
status: stable
tags: [decision]
---
# Python 3.12 with uv on Windows and CUDA

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/2026-10-12-mood-1-kickoff/`

## Context
Moodcut runs on a Windows 11 PC with an RTX 3060 Ti. Most ML packages (PyTorch, transformers, LanceDB, PyAV) publish Windows wheels for Python 3.12 first; newer Pythons lag for some CUDA libraries.

## Decision
Python 3.12, pinned with `uv` (`pyproject.toml` and `uv.lock`), with the CUDA PyTorch build from its index. pytest for tests, ruff for lint and format. `mood doctor` checks the CUDA build, the GPU, FFmpeg and yt-dlp first.

## Alternatives considered
- Python 3.13 or 3.14 (installed on the planning laptop): wheels lag for some CUDA libraries.
- conda: heavier and slower to reproduce.
- WSL2: one more layer for the owner to run.

## Consequences
- uv downloads Python 3.12 itself; no system install needed.
- Moving to a newer Python is a new decision once the ML wheels catch up.
