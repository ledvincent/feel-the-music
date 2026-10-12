# Architecture

* [Architecture overview](overview.md) - Local Python CLI tools (mood) do ingest, search and rendering on one GPU PC; Claude Code drives them and does the creative judgement.
* [Tech stack](tech-stack.md) - Python 3.12 managed with uv, PyTorch with CUDA on an 8 GB RTX 3060 Ti, LanceDB, SigLIP and FFmpeg; local and free only.
