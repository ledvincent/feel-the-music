---
type: Architecture
title: Tech stack
description: Python 3.12 managed with uv, PyTorch with CUDA on an 8 GB RTX 3060 Ti, LanceDB, SigLIP and FFmpeg; local and free only.
owner: ledvincent
status: stable
tags: [architecture, stack]
---
# Tech stack

Changing a line here is a decision: it needs a file in `/decisions/`.

## Frameworks and versions
| Layer | Choice | Version |
|---|---|---|
| Language | Python | 3.12 ([002](/decisions/002-python-312-uv-windows-cuda.md)) |
| Packaging | uv (`pyproject.toml`, `uv.lock`) | latest |
| ML runtime | PyTorch, CUDA 12.4 build from the `pytorch-cu124` index (torch only) | pinned in `uv.lock` |
| Command line | Typer; `--json` before or after the command (design D2, D6 of `openspec/changes/archive/mood-2-project-skeleton-2026-10-14/design.md`) | pinned in `uv.lock` |
| Shot store | LanceDB ([004](/decisions/004-lancedb-one-row-per-shot.md)) | pinned in `uv.lock` |
| Look embeddings and tags | SigLIP `google/siglip-so400m-patch14-384`, fp16 ([005](/decisions/005-siglip-embeddings-and-tags.md)) | |
| Video | FFmpeg, NVENC encoding | |
| Song audio | yt-dlp ([008](/decisions/008-song-audio-from-youtube.md)) | kept up to date |
| Tests, lint | pytest, ruff | |
| Hardware | RTX 3060 Ti, 8 GB VRAM, Windows 11 | |

Proposed, chosen in their backlog tickets: TransNetV2 for shot splitting (backlog 2), a small Qwen-VL model for the expensive pass (backlog 6), FFmpeg filter graphs with ASS subtitles for rendering (backlog 10), Beat This! for beats (backlog 15), WhisperX or stable-ts for word alignment (backlog 16). Backlog numbers are the rows of the MOOD-1 proposal.

## Rules
- Every model fits in 8 GB of VRAM, and only one large model is loaded at a time ([003](/decisions/003-one-gpu-model-at-a-time.md)).
- No paid API or cloud service. Models are downloaded once from Hugging Face into `models/`.
- Tests never need a GPU or a network: tiny fixtures, fake models.

## Allowed libraries
- transformers / open_clip: loading SigLIP and the vision-language model
- PyAV or decord: reading video frames
- FastAPI: the local review page only (`127.0.0.1`)

## Banned libraries
- madmom: painful Windows build; use Beat This! or librosa.
- Any paid or hosted API client (OpenAI, Anthropic API, Spotify Web API): the brief requires $0 and local.
