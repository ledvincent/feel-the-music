---
type: Decision
title: One large GPU model at a time, pass by pass
description: Ingest and song analysis run in passes, each loading one model, processing a batch and freeing GPU memory before the next.
owner: ledvincent
status: stable
tags: [decision]
---
# One large GPU model at a time, pass by pass

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/2026-10-12-mood-1-kickoff/`

## Context
The GPU has 8 GB of VRAM. SigLIP, the vision-language model, the shot splitter, the beat tracker and the word aligner do not fit together.

## Decision
Ingest runs in passes over a batch of shots: split, cheap pass, junk deletion, expensive pass. Each pass loads its model, processes the whole batch, saves, and frees GPU memory. Passes are resumable: a pass skips shots that already have its columns at the current `pipeline_version`; raising the version makes the next run redo older rows. The same rule applies to the beat tracker and the word aligner.

## Alternatives considered
- One model server holding all models: does not fit in 8 GB.

## Consequences
- Ingest is slower but can stop and resume, and can run overnight.
- Adding an emotion or changing a model is a `pipeline_version` bump followed by a re-run.
