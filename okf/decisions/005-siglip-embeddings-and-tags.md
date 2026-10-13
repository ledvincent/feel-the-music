---
type: Decision
title: SigLIP for look embeddings and zero-shot tags
description: One SigLIP model gives every shot its look embedding and its zero-shot emotion, content and shot-type tags, and embeds search text.
owner: ledvincent
status: stable
tags: [decision]
---
# SigLIP for look embeddings and zero-shot tags

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/mood-1-kickoff-2026-10-12/`

## Context
Every shot needs a cheap description of its look and rough tags, and search must compare text with images.

## Decision
`google/siglip-so400m-patch14-384` in fp16 (about 2 GB VRAM). A shot's embedding is the mean of a few sampled frames. Zero-shot tags compare frames with text prompts built from the [emotion list](/decisions/006-fixed-emotion-list.md). Search ranks by the SigLIP text embedding of a visual description, so one model serves ingest and search.

## Alternatives considered
- CLIP ViT-L/14: weaker on fine visual detail.
- SigLIP 2: newer; can replace this if a test set shows better results, with every embedding recomputed.

## Consequences
- Zero-shot tags are noisy: they only filter broadly; the expensive pass and Claude decide.
- Changing the model means recomputing all embeddings.
