---
type: Glossary Term
title: Cheap pass
description: "The first analysis every shot gets: a look embedding, zero-shot tags and measured stats, plus junk deletion."
owner: ledvincent
status: stable
tags: [domain]
---
# Cheap pass

## Definition
Run on every shot right after splitting: a SigLIP look embedding, zero-shot tags (emotion, content, shot type), measured brightness, warmth and motion. Junk shots (credits, burned-in subtitles, black frames) are deleted here.

## Not to be confused with
- [Expensive pass](/domain/expensive-pass.md): only on surviving shots, with a vision-language model.

## Rules
- Every stored shot has its cheap-pass values.
- Tags are broad filters, not final judgements.

## Where it is used
Specs: `openspec/specs/footage-ingest/spec.md`. Decisions: [/decisions/005-siglip-embeddings-and-tags.md](/decisions/005-siglip-embeddings-and-tags.md).
